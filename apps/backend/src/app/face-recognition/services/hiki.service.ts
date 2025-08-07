import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import { convertXML } from 'simple-xml-to-json';
import { AppConfigService } from '@backend/app/config';

// --- Custom Error Classes for specific ISAPI issues ---
export class IsapiOperationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly statusString: string,
    public readonly subStatusCode: string,
    public readonly errorCode: number,
    public readonly errorMsg: string,
    public readonly requestURL: string
  ) {
    super(
      `ISAPI Error on ${requestURL}: ${statusString} (${statusCode}) - ${errorMsg} (${subStatusCode})`
    );
    this.name = 'IsapiOperationError';
  }
}

export class DeviceConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceConnectionError';
  }
}

// --- TypeScript Interfaces for ISAPI Payloads ---
interface IsapiResponseStatus {
  requestURL: string;
  statusCode: number;
  statusString: string;
  subStatusCode: string;
  errorCode?: number;
  errorMsg?: string;
}

interface DeviceInfo {
  deviceName: string;
  deviceID: string;
  model: string;
  serialNumber: string;
  macAddress: string;
  firmwareVersion: string;
  deviceType: string;
}

/**
 * Implements the Device Interaction Layer for Hikvision ISAPI.
 * Handles HTTP Digest Authentication and robust error handling.
 */
@Injectable()
export class HikvisionIsapiService {
  private readonly logger = new Logger(HikvisionIsapiService.name);
  private readonly host: string;
  private readonly port: number;
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: AppConfigService
  ) {
    const config = this.configService.faceRecognition.hikvision;
    this.host = config.host;
    this.port = config.port;
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = `http://${this.host}:${this.port}`;
  }

  /**
   * Retrieves basic device information. A good method to test connectivity.
   * [cite_start]Corresponds to GET /ISAPI/System/deviceInfo[cite: 664].
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const responseXml = await this.isapiRequest<string>({
      method: 'GET',
      url: '/ISAPI/System/deviceInfo',
    });
    const { DeviceInfo: deviceInfo } = this.parseXmlResponse(responseXml);
    return deviceInfo;
  }

  /**
   * Adds a person to the device's access control database.
   * [cite_start]Corresponds to POST /ISAPI/AccessControl/UserInfo/Record[cite: 288].
   * [cite_start]@param employeeNo A unique identifier for the person[cite: 267].
   * @param name The name of the person.
   * [cite_start]@param userType The type of person (e.g., normal, visitor, blocklist)[cite: 6].
   */
  async addPerson(
    employeeNo: string,
    name: string,
    userType: 'normal' | 'visitor' = 'normal'
  ): Promise<void> {
    const payload = {
      UserInfo: {
        checkUser: false,
        employeeNo,
        name,
        userType,
        Valid: {
          enable: false,
          beginTime: new Date().toLocaleString(), // Default start time
          endTime: '2037-12-31T23:59:59', // Default end time
          timeType: 'local',
        },
      },
    };

    await this.isapiRequest({
      method: 'POST',
      url: '/ISAPI/AccessControl/UserInfo/Record?format=json',
      data: payload,
    });
    this.logger.log(`Successfully added person: ${employeeNo}`);
  }

  // In hikvision-isapi.service.ts

  /**
   * Adds a face picture and links it to an existing person.
   * This version uses the 'FaceDataRecord' endpoint and includes faceLibType in the URL.
   * This is a multipart/form-data request[cite: 106].
   * Corresponds to POST /ISAPI/Intelligent/FDLib/FaceDataRecord[cite: 446].
   * @param employeeNo The ID of the person to link the face to[cite: 11].
   * @param faceImageBuffer A buffer containing the JPEG image data.
   */
  async addFace(employeeNo: string, faceImageBuffer: Buffer): Promise<void> {
    const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
    const faceLibType = 'blackFD'; // Using a variable for consistency

    const metadata = JSON.stringify({
      FaceDataRecord: {
        faceLibType: faceLibType,
        FDID: '1', // Default library ID
        FPID: employeeNo,
      },
    });

    const payloadStart =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="FaceDataRecord"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="faceImage"; filename="face.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`;

    const payloadEnd = `\r\n--${boundary}--\r\n`;

    const payloadBuffer = Buffer.concat([
      Buffer.from(payloadStart, 'utf-8'),
      faceImageBuffer,
      Buffer.from(payloadEnd, 'utf-8'),
    ]);

    // --- FIX IS HERE: Added 'faceLibType' as a URL query parameter ---
    const url = `/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json&faceLibType=${faceLibType}`;

    await this.isapiRequest({
      method: 'POST',
      url, // <-- Use the new URL with the query parameter
      data: payloadBuffer,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    });

    this.logger.log(`Successfully added face for person: ${employeeNo}`);
  }

  /**
   * [cite_start]Deletes a person and all their associated credentials (card, face, fingerprint)[cite: 306].
   * [cite_start]Corresponds to PUT /ISAPI/AccessControl/UserInfoDetail/Delete[cite: 300].
   * @param employeeNo The unique ID of the person to delete.
   */
  async deletePerson(employeeNo: string): Promise<void> {
    const payload = {
      UserInfoDetail: {
        mode: 'byEmployeeNo',
        EmployeeNoList: [{ employeeNo }],
      },
    };
    await this.isapiRequest({
      method: 'PUT',
      url: '/ISAPI/AccessControl/UserInfoDetail/Delete?format=json',
      data: payload,
    });
    this.logger.log(`Successfully deleted person: ${employeeNo}`);
  }

  /**
   * Configures a device to send event notifications to a specified listening host.
   * [cite_start]This is central to the "Listening Mode" architecture[cite: 160].
   * [cite_start]Corresponds to PUT /ISAPI/Event/notification/httpHosts/<hostID>[cite: 216].
   * @param listenerUrl The full URL of the event listener service.
   * @param hostId The ID of the host slot on the device (usually 1).
   */
  async setEventListener(listenerUrl: string, hostId = 1): Promise<void> {
    const payload = {
      HttpHostNotification: {
        id: hostId,
        url: listenerUrl,
        protocolType: 'HTTP',
        parameterFormatType: 'JSON',
        httpAuthenticationMethod: 'none',
      },
    };
    await this.isapiRequest({
      method: 'PUT',
      url: `/ISAPI/Event/notification/httpHosts/${hostId}?format=json`,
      data: payload,
    });
    this.logger.log(`Event listener set to ${listenerUrl} on host ID ${hostId}`);
  }

  // --- Core Request and Authentication Logic ---

  /**
   * A generic wrapper for making ISAPI requests that handles Digest Auth.
   * @param config Axios request configuration.
   * @param isRetry A flag to prevent infinite retry loops.
   */
  private async isapiRequest<T = any>(config: AxiosRequestConfig, isRetry = false): Promise<T> {
    const url = `${this.baseUrl}${config.url}`;
    try {
      const response: any = await firstValueFrom(this.httpService.request<T>({ ...config, url }));
      this.checkForIsapiError(response.data);

      return response.data;
    } catch (error: any) {
      console.log(error);
      if (error instanceof AxiosError) {
        if (
          !isRetry &&
          error.response?.status === 401 &&
          error.response.headers['www-authenticate']?.includes('Digest')
        ) {
          this.logger.debug('Received Digest challenge. Retrying with authentication.');
          const digestHeader = this.generateDigestAuthHeader(
            config.method.toUpperCase(),
            config.url,
            error.response.headers['www-authenticate']
          );
          const newConfig = {
            ...config,
            headers: { ...config.headers, Authorization: digestHeader },
          };
          const result = await this.isapiRequest(newConfig, true);
          console.log(result);
          return result;
        }
        // throw new DeviceConnectionError(
        //   `Request to ${url} failed: ${error.message} (Status: ${error.response?.status})`
        // );
      }
      return error;
      throw new DeviceConnectionError(`An unexpected error occurred: ${error.message}`);
    }
  }

  /**
   * Generates the HTTP Digest Authentication header.
   */
  private generateDigestAuthHeader(method: string, uri: string, wwwAuthHeader: string): string {
    const realm = this.extractFromAuth(wwwAuthHeader, 'realm');
    const nonce = this.extractFromAuth(wwwAuthHeader, 'nonce');
    const qop = this.extractFromAuth(wwwAuthHeader, 'qop');

    const nc = '00000001'; // Nonce count, increment for subsequent requests in the same session
    const cnonce = crypto.randomBytes(8).toString('hex'); // Client nonce

    const ha1 = crypto
      .createHash('md5')
      .update(`${this.username}:${realm}:${this.password}`)
      .digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');

    let responseHash;
    if (qop) {
      responseHash = crypto
        .createHash('md5')
        .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
        .digest('hex');
    } else {
      responseHash = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    }

    const digestParts = [
      `username="${this.username}"`,
      `realm="${realm}"`,
      `nonce="${nonce}"`,
      `uri="${uri}"`,
      `response="${responseHash}"`,
    ];

    if (qop) {
      digestParts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
    }

    return `Digest ${digestParts.join(', ')}`;
  }

  /**
   * A helper to extract values from the WWW-Authenticate header.
   */
  private extractFromAuth(authHeader: string, key: string): string {
    const match = new RegExp(`${key}="([^"]*)"`).exec(authHeader);
    return match ? match[1] : '';
  }

  /**
   * Parses XML response to JSON.
   */
  private parseXmlResponse(xml: string): any {
    try {
      return convertXML(xml);
    } catch {
      throw new Error('Failed to parse XML response from device.');
    }
  }

  /**
   * Checks for ISAPI-specific errors in a successful (2xx) HTTP response.
   * [cite_start]Based on the Error Processing section[cite: 152].
   */
  private checkForIsapiError(data: any): void {
    if (typeof data !== 'object' || data === null) {
      return;
    } // Debugging line to inspect the response structure
    let status: IsapiResponseStatus;

    if (data.ResponseStatus) {
      // XML format
      status = data.ResponseStatus;
    } else if (data.statusCode && data.statusString) {
      // JSON format
      status = data;
    } else {
      return; // Not a standard ISAPI status response
    }

    // According to the documentation, a status code of 1 or "OK" indicates success.
    // However, some devices use 200 for OK in JSON but 1 for OK in XML.
    // A simple check for statusCode > 1 or non-OK string is safer.
    if (status.statusCode > 1 && status.statusString !== 'OK') {
      throw new IsapiOperationError(
        status.statusCode,
        status.statusString,
        status.subStatusCode,
        status.errorCode || -1,
        status.errorMsg || 'No error message provided.',
        status.requestURL
      );
    }
  }
}
