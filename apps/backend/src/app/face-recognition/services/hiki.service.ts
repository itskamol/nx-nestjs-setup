import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import { convertXML } from 'simple-xml-to-json';
import { create as createXML } from 'xmlbuilder2';
import { AppConfigService } from '@backend/app/config';
import { CreatePermissionTemplateDto } from '../dto/hikvision.dto';

// --- Custom Error Classes for specific ISAPI issues ---
// Xatoliklarni o'zbek tiliga tarjima qilish uchun lug'at
const ISAPI_ERROR_MESSAGES: Record<string, string> = {
  // Umumiy xatoliklar
  MessageParametersLack:
    "So'rovda kerakli parametrlar yetishmayapti. Yuborilgan ma'lumotlarni tekshiring.",
  notSupport:
    "Ushbu operatsiya qurilma tomonidan qo'llab-quvvatlanmaydi. Boshqa usulni sinab ko'ring.",
  invalidOperation: "Noto'g'ri operatsiya. So'rov formatini yoki parametrlarini tekshiring.",
  deviceBusy: "Qurilma band. Biroz kutib qayta urinib ko'ring.",
  deviceError: 'Qurilmada ichki xatolik yuz berdi.',

  // Foydalanuvchi boshqaruvi
  employeeNoAlreadyExist: 'Bunday ID raqamli foydalanuvchi allaqachon mavjud.',
  userNotExist: 'Bunday foydalanuvchi topilmadi.',
  userNameAlreadyExist: 'Bunday nomli foydalanuvchi allaqachon mavjud.',
  reachTheMaxNum: 'Maksimal foydalanuvchilar soniga yetdi.',
  invalidUserInfo: "Foydalanuvchi ma'lumotlari noto'g'ri formatda.",

  // Yuz tanish (Face Recognition)
  faceNotExist: "Yuz ma'lumotlari topilmadi.",
  faceAlreadyExist: "Bu yuz ma'lumotlari allaqachon mavjud.",
  invalidFaceData: "Yuz rasmi formati noto'g'ri yoki buzilgan.",
  faceLibraryFull: "Yuz ma'lumotlari bazasi to'lgan.",
  lowQualityPicture: 'Rasm sifati past. Yanada aniq rasm yuklang.',
  noFaceInPicture: 'Rasmda yuz aniqlanmadi.',
  multipleFacesInPicture: "Rasmda bir nechta yuz aniqlandi. Faqat bitta yuz bo'lishi kerak.",

  // Autentifikatsiya
  cannotSameAsOldPassword: "Yangi parol eskisi bilan bir xil bo'lishi mumkin emas.",
  theAccountisNotActivated: 'Foydalanuvchi akkaunti aktivlashtirilmagan.',
  loginPasswordError: "Login paroli noto'g'ri kiritildi.",
  administratorPasswordError: "Administrator paroli noto'g'ri.",
  userLocked: 'Foydalanuvchi akkaunti bloklangan.',
  passwordExpired: 'Parolning muddati tugagan.',

  // Tarmoq va ulanish
  networkError: 'Tarmoq ulanishida xatolik.',
  timeout: "So'rov vaqti tugadi.",
  deviceNotReachable: "Qurilmaga ulanib bo'lmadi.",

  // Voqealar (Events)
  eventNotSupport: "Tanlangan voqea (event) turiga obuna bo'lish qo'llab-quvvatlanmaydi.",
  eventSubscriptionFailed: "Voqealar obunasini o'rnatishda xatolik.",

  // Fayl operatsiyalari
  fileFormatNotSupported: "Fayl formati qo'llab-quvvatlanmaydi.",
  fileSizeExceeded: 'Fayl hajmi ruxsat etilgan limitdan katta.',
  uploadFailed: 'Fayl yuklashda xatolik.',

  // Ma'lumotlar bazasi
  databaseError: "Ma'lumotlar bazasida xatolik.",
  recordNotFound: 'Yozuv topilmadi.',
  duplicateRecord: 'Takroriy yozuv.',
};
export class IsapiOperationError extends Error {
  public readonly localizedMessage: string;

  constructor(
    public readonly statusCode: number,
    public readonly statusString: string,
    public readonly subStatusCode: string,
    public readonly errorCode: number,
    public readonly errorMsg: string,
    public readonly requestURL: string
  ) {
    // subStatusCode ga mos o'zbek tilidagi xabarni topish
    const localizedMsg = ISAPI_ERROR_MESSAGES[subStatusCode] || errorMsg;

    super(`ISAPI Xatolik ${requestURL} da: ${statusString} (${statusCode}) - ${localizedMsg}`);

    this.localizedMessage = localizedMsg;
    this.name = 'IsapiOperationError';
  }

  /**
   * Foydalanuvchiga ko'rsatish uchun tushunarli xabar
   */
  getUserFriendlyMessage(): string {
    return this.localizedMessage;
  }

  /**
   * Debugging uchun to'liq ma'lumot
   */
  getDetailedInfo() {
    return {
      url: this.requestURL,
      statusCode: this.statusCode,
      statusString: this.statusString,
      subStatusCode: this.subStatusCode,
      errorCode: this.errorCode,
      originalMessage: this.errorMsg,
      localizedMessage: this.localizedMessage,
    };
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

// interface DeviceInfo {
//   deviceName: string;
//   deviceID: string;
//   model: string;
//   serialNumber: string;
//   macAddress: string;
//   firmwareVersion: string;
//   deviceType: string;
// }

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
   * Corresponds to GET /ISAPI/System/deviceInfo[cite: 664].
   */
  async getDeviceInfo(): Promise<any> {
    const responseXml = await this.isapiRequest<string>({
      method: 'GET',
      url: '/ISAPI/System/capabilities',
    });

    const parsed = this.parseXmlResponse(responseXml);
    const deviceInfo = parsed.DeviceCap;

    if (!deviceInfo) {
      throw new Error('Invalid device info response format');
    }

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

  async getPerson(employeeNo: string): Promise<any> {
    const payload = {
      UserInfoSearchCond: {
        searchID: 'search_1', // searchID istalgan noyob satr bo'lishi mumkin
        searchResultPosition: 0,
        maxResults: 1,
        employeeNoList: [
          {
            employeeNo,
          },
        ],
      },
    };

    const response = await this.isapiRequest<any>({
      // --- XATOLIK SHU YERDA EDI ---
      method: 'POST', // GET o'rniga POST bo'lishi kerak
      url: '/ISAPI/AccessControl/UserInfo/Search?format=json',
      data: payload,
    });

    if (
      !response.UserInfoSearch ||
      !response.UserInfoSearch.UserInfo ||
      response.UserInfoSearch.numOfMatches === 0
    ) {
      // Shuningdek, qidiruv javobining tuzilishini tekshirish muhim
      throw new DeviceConnectionError(`Person ${employeeNo} not found.`);
    }

    // Odatda bir kishi qidirilganda, natija massivning birinchi elementi bo'ladi
    return response.UserInfoSearch.UserInfo[0];
  }

  async addFaceByUrl(employeeNo: string, imageUrl: string): Promise<void> {
    // Yuz qo'shishdan oldin kutubxona mavjudligini tekshirish
    const { faceLibType, FDID } = await this.ensureFaceLibraryExists();

    const image = `http://192.168.100.225:3001/${imageUrl}`;

    const payload = {
      faceURL: image,
      faceLibType,
      FDID,
      FPID: employeeNo,
    };

    await this.isapiRequest({
      method: 'PUT',
      url: '/ISAPI/Intelligent/FDLib/FDSetUp?format=json',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await this.assignPermissionToPerson(employeeNo, 1, '1');

    this.logger.log(`Successfully requested to add face from URL for person: ${employeeNo}`);
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
    const faceLibType = 'blackFD';

    const metadata = JSON.stringify({
      FaceAppendData: {
        faceLibType,
        FDID: '1',
        FPID: employeeNo,
      },
    });

    const payloadStart =
      `--${boundary}\r\n` +
      // *** FIX 2: The 'name' of the form part must match the JSON object ***
      `Content-Disposition: form-data; name="FaceAppendData"\r\n` +
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

    // *** FIX 3: Removed the redundant query parameter for a cleaner request ***
    const url = `/ISAPI/Intelligent/FDLib/FDSetUp?format=json`;

    await this.isapiRequest({
      method: 'PUT',
      url,
      data: payloadBuffer,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    });

    this.logger.log(`Successfully applied face for person: ${employeeNo}`);
  }

  formatDateTime(date: Date, timeType: string): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    // Vaqt mintaqasini olish
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60))
      .toString()
      .padStart(2, '0');
    const offsetRemainingMinutes = Math.abs(offsetMinutes % 60)
      .toString()
      .padStart(2, '0');
    const sign = offsetMinutes > 0 ? '-' : '+';

    if (timeType === 'local') {
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainingMinutes}`;
  }

  // in hikvision-isapi.service.ts
  /**
   * Assigns an access permission schedule to an existing person for a specific door.
   * @param employeeNo The unique ID of the person.
   * @param doorId The ID of the door to grant access to (usually 1).
   * @param planTemplateId The ID of the permission schedule template created in the web interface.
   */
  async assignPermissionToPerson(
    employeeNo: string,
    doorId: number,
    planTemplateId: string,
    enable: boolean = true,
    start: string = new Date().toISOString(),
    end: string = new Date(Date.now() + 60 * 60 * 1000 * 1000).toISOString(),
    timeType: string = 'local'
  ): Promise<void> {
    const beginTime = this.formatDateTime(new Date(start), timeType);
    const endTime = this.formatDateTime(new Date(end), timeType);

    const payload = {
      UserInfo: {
        employeeNo,
        RightPlan: [
          {
            doorNo: doorId,
            // planTemplateNo: planTemplateId,
          },
        ],
        Valid: {
          enable,
          beginTime,
          endTime,
          timeType,
        },
      },
    };
    console.log(payload.UserInfo.Valid);
    // We use 'SetUp' endpoint to update the user record
    await this.isapiRequest({
      method: 'PUT',
      url: '/ISAPI/AccessControl/UserInfo/Modify?format=json',
      data: payload,
    });

    this.logger.log(
      `Successfully assigned permission plan ${planTemplateId} for door ${doorId} to person ${employeeNo}`
    );
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

  async testEventListener(hostId: number = 1): Promise<void> {
    const url = `/ISAPI/Event/notification/httpHosts/${hostId}`;

    await this.isapiRequest({
      method: 'GET',
      url,
    });

    this.logger.log(`Test event sent to listener host ${hostId}. Check your server logs.`);
  }

  /**
   * Configures a device to send event notifications to a specified listening host.
   * [cite_start]This is central to the "Listening Mode" architecture[cite: 160].
   * [cite_start]Corresponds to PUT /ISAPI/Event/notification/httpHosts/<hostID>[cite: 216].
   * @param listenerUrl The full URL of the event listener service.
   * @param hostId The ID of the host slot on the device (usually 1).
   */
  async setEventListener(
    listenerUrl: string,
    hostId: number = 1,
    eventTypes: string[] = ['AccessControllerEvent']
  ): Promise<void> {
    // 1. XML tuzilishiga mos keladigan JavaScript ob'ektini yaratamiz
    const jsObject = {
      HttpHostNotification: {
        '@version': '2.0',
        '@xmlns': 'http://www.isapi.org/ver20/XMLSchema',
        id: hostId,
        url: listenerUrl,
        protocolType: 'HTTP',
        parameterFormatType: 'JSON',
        httpAuthenticationMethod: 'none',
        addressingFormatType: 'ipaddress',
        eventMode: 'list',
        EventList: {
          Event: eventTypes.map(type => ({ type })),
        },
      },
    };

    // 2. Ob'ektdan XML matnini yaratamiz
    const xmlPayload = createXML(jsObject).end({ prettyPrint: true });
    // this.logger.debug('Generated XML Payload for setEventListener:', xmlPayload);

    // URL'dan "?format=json" olib tashlandi, chunki endi XML yuboryapmiz
    const url = `/ISAPI/Event/notification/httpHosts/${hostId}`;
    // console.log(xmlPayload);
    await this.isapiRequest({
      method: 'PUT',
      url,
      data: xmlPayload,
      headers: {
        // 3. Content-Type'ni to'g'ri ko'rsatamiz
        'Content-Type': 'application/xml; charset="UTF-8"',
      },
    });

    this.logger.log(`Event listener for host ${hostId} successfully set to: ${listenerUrl}`);
  }

  async createOrUpdate247Template(dto: CreatePermissionTemplateDto): Promise<void> {
    const { templateId, templateName } = dto;
    console.log(`Creating 24/7 template with ID: ${templateId} and Name: ${templateName}`);
    // 1-QADAM: Haftalik jadvalni 24/7 rejimiga sozlash.
    // Biz asosiy shablon bilan bir xil ID'dagi haftalik jadvaldan foydalanamiz.
    const weekPlanId = templateId;
    await this._configure247WeeklyPlan(weekPlanId);

    // 2-QADAM: Asosiy shablonni sozlab, unga haftalik jadvalni bog'lash.
    await this._linkWeeklyPlanToTemplate(templateId, templateName, weekPlanId);

    this.logger.log(
      `Permission template ${templateId} ('${templateName}') was configured successfully.`
    );
  }

  /**
   * Belgilangan haftalik jadvalni (weekPlan) 24/7 rejimiga sozlaydi.
   * Bu yordamchi (private) funksiya.
   */
  private async _configure247WeeklyPlan(weekPlanId: number): Promise<void> {
    this.logger.debug(`Configuring week plan ${weekPlanId} to 24/7...`);
    const payload = {
      UserRightWeekPlanCfg: {
        enable: true,
        WeekPlanCfg: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ].map(day => ({
          week: day,
          id: 1,
          enable: true,
          TimeSegment: { beginTime: '00:00:00', endTime: '23:59:59' },
        })),
      },
    };

    await this.isapiRequest({
      method: 'PUT',
      url: `/ISAPI/AccessControl/UserRightWeekPlanCfg/${weekPlanId}?format=json`,
      data: payload,
    });
  }

  /**
   * Asosiy shablonni (PlanTemplate) yaratadi va unga berilgan haftalik jadvalni bog'laydi.
   * Bu yordamchi (private) funksiya.
   */
  private async _linkWeeklyPlanToTemplate(
    templateId: number,
    templateName: string,
    weekPlanId: number
  ): Promise<void> {
    this.logger.debug(`Linking week plan ${weekPlanId} to main template ${templateId}...`);
    const payload = {
      UserRightPlanTemplate: {
        enable: true,
        templateName,
        weekPlanNo: weekPlanId,
        holidayGroupNo: "1"
      },
    };

    await this.isapiRequest({
      method: 'PUT',
      url: `/ISAPI/AccessControl/UserRightPlanTemplate/${templateId}?format=json`,
      data: payload,
    });
  }

  // --- Core Request and Authentication Logic ---

  private async ensureFaceLibraryExists(): Promise<any> {
    try {
      // 1. Check if the library already exists.
      const response = await this.isapiRequest<any>({
        method: 'GET',
        url: '/ISAPI/Intelligent/FDLib?format=json&faceLibType=blackFD',
      });
      // The response can be an object or an array.
      const libraries = response?.FDLib || [];
      const libraryExists = Array.isArray(libraries)
        ? libraries.find(lib => lib.FDID === '1')
        : libraries.FDID === '1';

      if (libraryExists) {
        this.logger.debug('Default face library (FDID: 1) already exists.');
        return libraryExists;
      }
    } catch {
      // An error (like 404 Not Found) might mean no libraries exist yet, which is fine.
      this.logger.log('No face libraries found, proceeding to create one.');
    }

    // 2. If it doesn't exist, create it.
    this.logger.log('Creating default face library (FDID: 1)...');
    const createPayload = {
      FDLibBaseCfg: {
        FDID: '1',
        name: 'Default-Library',
        faceLibType: 'blackFD',
      },
    };

    await this.isapiRequest({
      method: 'POST',
      url: '/ISAPI/Intelligent/FDLib?format=json',
      data: createPayload,
    });

    this.logger.log('Default face library created successfully.');
  }

  /**
   * Generic wrapper for ISAPI requests with built-in Digest Authentication
   */
  private async isapiRequest<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    const url = `${this.baseUrl}${config.url}`;

    try {
      // Try without auth first (some endpoints don't need it)
      const response = await firstValueFrom(this.httpService.request<T>({ ...config, url }));

      this.validateIsapiResponse(response.data, url);
      return response.data;
    } catch (error: unknown) {
      // Handle 401 - Digest Auth required
      if (this.isDigestChallenge(error)) {
        return this.retryWithDigestAuth(config, error as AxiosError);
      }

      // Handle other errors
      throw this.createDetailedError(error, url);
    }
  }

  /**
   * Retry request with Digest Authentication
   */
  private async retryWithDigestAuth<T>(
    config: AxiosRequestConfig,
    challengeError: AxiosError
  ): Promise<T> {
    const url = `${this.baseUrl}${config.url}`;
    const wwwAuth = challengeError.response?.headers['www-authenticate'];

    if (!wwwAuth) {
      throw new DeviceConnectionError('Missing WWW-Authenticate header in 401 response');
    }

    const digestHeader = this.buildDigestHeader(
      config.method?.toUpperCase() || 'GET',
      config.url || '',
      wwwAuth
    );

    const authConfig = {
      ...config,
      headers: {
        ...config.headers,
        Authorization: digestHeader,
      },
    };

    try {
      const response = await firstValueFrom(this.httpService.request<T>({ ...authConfig, url }));

      this.validateIsapiResponse(response.data, url);
      return response.data;
    } catch (retryError) {
      console.log(retryError);
      throw this.createDetailedError(retryError, url);
    }
  }

  /**
   * Check if error is a Digest authentication challenge
   */
  private isDigestChallenge(error: unknown): boolean {
    return (
      error instanceof AxiosError &&
      error.response?.status === 401 &&
      error.response.headers['www-authenticate']?.includes('Digest')
    );
  }

  /**
   * Create detailed error with context
   */
  private createDetailedError(error: unknown, url: string): Error {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const data = error.response?.data;

      // ISAPI specific error in response body
      if (data && typeof data === 'object' && data.statusString) {
        console.log(data);
        return new IsapiOperationError(
          data.statusCode || status || 0,
          data.statusString || statusText || 'Unknown',
          data.subStatusCode || '',
          data.errorCode || 0,
          data.errorMsg || error.message,
          url
        );
      }

      // HTTP error
      return new DeviceConnectionError(`HTTP ${status} ${statusText} on ${url}: ${error.message}`);
    }

    // Generic error
    return new DeviceConnectionError(`Request failed to ${url}: ${String(error)}`);
  }

  /**
   * Validate ISAPI response for errors
   */
  private validateIsapiResponse(data: unknown, url: string): void {
    if (typeof data !== 'object' || data === null) {
      return;
    }

    let status: IsapiResponseStatus | null = null;

    // Try to extract status from different response formats
    if ('ResponseStatus' in data) {
      status = data.ResponseStatus as IsapiResponseStatus;
    } else if ('statusCode' in data && 'statusString' in data) {
      status = data as IsapiResponseStatus;
    }

    if (!status) return;

    // Check for ISAPI errors (statusCode > 1 indicates error)
    if (status.statusCode > 1 && status.statusString !== 'OK') {
      throw new IsapiOperationError(
        status.statusCode,
        status.statusString,
        status.subStatusCode || '',
        status.errorCode || 0,
        status.errorMsg || 'No error message provided',
        url
      );
    }
  }

  /**
   * Build Digest Authentication header
   */
  private buildDigestHeader(method: string, uri: string, wwwAuthHeader: string): string {
    const realm = this.extractFromAuth(wwwAuthHeader, 'realm');
    const nonce = this.extractFromAuth(wwwAuthHeader, 'nonce');
    const qop = this.extractFromAuth(wwwAuthHeader, 'qop');

    const nc = '00000001';
    const cnonce = crypto.randomBytes(8).toString('hex');

    const ha1 = crypto
      .createHash('md5')
      .update(`${this.username}:${realm}:${this.password}`)
      .digest('hex');

    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');

    let responseHash: string;
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
  private parseXmlResponse(xml: string): Record<string, unknown> {
    try {
      return convertXML(xml);
    } catch {
      throw new Error('Failed to parse XML response from device.');
    }
  }
}
