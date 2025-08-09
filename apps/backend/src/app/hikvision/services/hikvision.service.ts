import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { IDevice } from '@backend/app/device/interfaces/device.interface';
import { XmlService } from '@backend/app/common';

@Injectable()
export class HikvisionHttpService {
  private readonly logger = new Logger(HikvisionHttpService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly xmlService: XmlService
  ) {}

  async request<T>(device: IDevice, config: AxiosRequestConfig): Promise<T> {
    const baseUrl = `http://${device.host}:${device.port}`;
    const url = `${baseUrl}${config.url}`;

    try {
      await firstValueFrom(this.httpService.get(url));
      return (await firstValueFrom(this.httpService.request({ ...config, url }))).data;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        const authHeader = error.response.headers['www-authenticate'];
        if (!authHeader || !authHeader.toLowerCase().startsWith('digest')) {
          throw new HttpException(
            'Server is not supporting Digest authentication.',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        const digestParams = this.parseDigestHeader(authHeader);

        const authResponseHeader = this.createAuthorizationHeader(
          device,
          digestParams,
          config.method.toUpperCase() as Method,
          config.url
        );

        const finalConfig: AxiosRequestConfig = {
          ...config,
          url,
          headers: {
            ...config.headers,
            Authorization: authResponseHeader,
          },
        };

        try {
          const response = await firstValueFrom(this.httpService.request<T>(finalConfig));
          return response.data;
        } catch (e: any) {
          this.logger.error(`Autentifikatsiyali so'rovda xatolik: ${e.message}`, e.stack);
          throw new HttpException(
            e.response?.data || e.message,
            e.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }
      this.logger.error(`Boshlang'ich so'rovda xatolik: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || error.message,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private parseDigestHeader(header: string): Record<string, string> {
    const params: Record<string, string> = {};
    header
      .slice(7)
      .split(',')
      .forEach(part => {
        const [key, value] = part.trim().split(/=(.*)/s);
        params[key] = value.replace(/"/g, '');
      });
    return params;
  }

  private createAuthorizationHeader(
    device: IDevice,
    params: Record<string, string>,
    method: Method,
    uri: string
  ): string {
    const realm = params.realm;
    const qop = params.qop;
    const nonce = params.nonce;
    const opaque = params.opaque;
    const nc = '00000001';
    const cnonce = crypto.randomBytes(8).toString('hex');

    // `this.username` va `this.password` o'rniga `device`dan olingan ma'lumotlarni ishlatamiz
    const ha1 = crypto
      .createHash('md5')
      .update(`${device.username}:${realm}:${device.password}`)
      .digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
    const response = crypto
      .createHash('md5')
      .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      .digest('hex');

    const authParts = [
      `username="${device.username}"`,
      `realm="${realm}"`,
      `nonce="${nonce}"`,
      `uri="${uri}"`,
      `qop=${qop}`,
      `nc=${nc}`,
      `cnonce="${cnonce}"`,
      `response="${response}"`,
      `opaque="${opaque}"`,
    ];

    return `Digest ${authParts.join(', ')}`;
  }

  async get<T>(device: IDevice, url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>(device, { ...config, method: 'GET', url });
  }

  async post<T>(
    device: IDevice,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>(device, { ...config, method: 'POST', url, data });
  }

  async put<T>(device: IDevice, url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>(device, { ...config, method: 'PUT', url, data });
  }

  async delete<T>(device: IDevice, url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>(device, { ...config, method: 'DELETE', url });
  }

  async getDeviceInfo(device: IDevice): Promise<object> {
    const url = '/ISAPI/System/deviceInfo';
    const XMLresult: string = await this.get(device, url);
    return this.xmlService.convertToJSON(XMLresult);
  }

  async getDeviceCapabilities(device: IDevice): Promise<object> {
    const url = '/ISAPI/AccessControl/capabilities';
    const XMLresult: string = await this.get(device, url);
    return this.xmlService.convertToJSON(XMLresult);
  }
}
