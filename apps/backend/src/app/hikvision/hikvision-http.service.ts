import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class HikvisionHttpService {
  private readonly logger = new Logger(HikvisionHttpService.name);
  private readonly host: string;
  private readonly port: number;
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const hikvisionConfig = this.configService.get('app.faceRecognition.hikvision');
    this.host = hikvisionConfig.host;
    this.port = hikvisionConfig.port;
    this.username = hikvisionConfig.username;
    this.password = hikvisionConfig.password;
    this.baseUrl = `http://${this.host}:${this.port}`;
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const url = `${this.baseUrl}${config.url}`;
    try {
      // First, try the request without authentication
      // This is to get the WWW-Authenticate header
      await firstValueFrom(this.httpService.get(url));
      // If it succeeds without auth, just proxy the real request
      return (await firstValueFrom(this.httpService.request({ ...config, url }))).data;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        const authHeader = error.response.headers['www-authenticate'];
        if (!authHeader || !authHeader.toLowerCase().startsWith('digest')) {
          throw new HttpException('Digest auth not supported by the server.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const digestParams = this.parseDigestHeader(authHeader);
        const authResponseHeader = this.createAuthorizationHeader(
          digestParams,
          config.method.toUpperCase() as Method,
          config.url,
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
          this.logger.error(`Authenticated request failed: ${e.message}`, e.stack);
          throw new HttpException(e.response?.data || e.message, e.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
      this.logger.error(`Initial request failed: ${error.message}`, error.stack);
      throw new HttpException(error.response?.data || error.message, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private parseDigestHeader(header: string): Record<string, string> {
    const params = {};
    header.slice(7).split(',').forEach(part => {
      const [key, value] = part.trim().split(/=(.*)/s);
      params[key] = value.replace(/"/g, '');
    });
    return params;
  }

  private createAuthorizationHeader(
    params: Record<string, string>,
    method: Method,
    uri: string,
  ): string {
    const realm = params.realm;
    const qop = params.qop;
    const nonce = params.nonce;
    const opaque = params.opaque;
    const nc = '00000001'; // Nonce count, always 1 for the first request
    const cnonce = crypto.randomBytes(8).toString('hex'); // Client nonce

    const ha1 = crypto.createHash('md5').update(`${this.username}:${realm}:${this.password}`).digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
    const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');

    const authParts = [
      `username="${this.username}"`,
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

  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}
