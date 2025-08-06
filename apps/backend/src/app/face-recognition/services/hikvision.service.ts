import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { createHash, createHmac } from 'crypto';

@Injectable()
export class HikvisionService {
  private readonly logger = new Logger(HikvisionService.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private readonly configService: AppConfigService) {
    const config = this.configService.faceRecognition.hikvision;
    this.baseUrl = `http://${config.host}:${config.port}`;
    this.username = config.username;
    this.password = config.password;
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try Digest authentication first
      const digestResult = await this.testDigestAuth();
      if (digestResult.success) {
        this.logger.log(' Connection successful using Digest Authentication');
        return true;
      }

      // Fallback to Basic auth
      const response = await fetch(`${this.baseUrl}/ISAPI/Security/userCheck`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        this.logger.log(' Connection successful using Basic Authentication');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to connect to Hikvision device', error);
      return false;
    }
  }

  async enrollFace(
    imageData: string,
    faceId: string,
    options?: {
      name?: string;
      gender?: string;
      age?: number;
      cardNo?: string;
    }
  ): Promise<{ success: boolean; faceId?: string; error?: string }> {
    try {
      // Remove base64 prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

      const requestBody = {
        FaceInfoList: [
          {
            faceID: faceId,
            name: options?.name || faceId,
            gender: options?.gender || 'unknown',
            age: options?.age || 0,
            cardNo: options?.cardNo || '',
            facePic: base64Data,
          },
        ],
      };

      const response = await fetch(`${this.baseUrl}/ISAPI/Intelligent/FaceLib/FaceDataRecord`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Face enrollment failed: ${errorText}`);
        return { success: false, error: errorText };
      }

      await response.json();
      this.logger.log(`Face enrolled successfully: ${faceId}`);
      return { success: true, faceId };
    } catch (error) {
      this.logger.error('Face enrollment error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async recognizeFace(imageData: string): Promise<{
    success: boolean;
    faces?: Array<{
      faceId: string;
      confidence: number;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    error?: string;
  }> {
    try {
      // Remove base64 prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

      const requestBody = {
        FaceImageData: base64Data,
      };

      const response = await fetch(`${this.baseUrl}/ISAPI/Intelligent/FaceLib/FaceDataSearch`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Face recognition failed: ${errorText}`);
        return { success: false, error: errorText };
      }

      const result = await response.json();

      // Parse Hikvision response format
      const faces =
        result.FaceMatchList?.map((match: any) => ({
          faceId: match.faceID,
          confidence: match.similarity / 100, // Convert to 0-1 range
          boundingBox: match.boundingBox || {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
          },
        })) || [];

      return { success: true, faces };
    } catch (error) {
      this.logger.error('Face recognition error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteFace(faceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/ISAPI/Intelligent/FaceLib/FaceDataRecord?faceID=${faceId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Face deletion failed: ${errorText}`);
        return { success: false, error: errorText };
      }

      this.logger.log(`Face deleted successfully: ${faceId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Face deletion error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getFaceList(): Promise<{
    success: boolean;
    faces?: Array<{
      faceId: string;
      name: string;
      createTime: string;
    }>;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/ISAPI/Intelligent/FaceLib/FaceDataRecord?searchID=1`,
        {
          method: 'GET',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Get face list failed: ${errorText}`);
        return { success: false, error: errorText };
      }

      const result = await response.json();
      const faces =
        result.FaceInfoList?.map((face: any) => ({
          faceId: face.faceID,
          name: face.name,
          createTime: face.createTime,
        })) || [];

      return { success: true, faces };
    } catch (error) {
      this.logger.error('Get face list error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async setupWebhook(
    webhookUrl: string,
    secret: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestBody = {
        EventNotificationList: [
          {
            eventTypes: ['FaceDetection', 'FaceRecognition'],
            notificationMethod: 'HTTP',
            httpURL: webhookUrl,
            httpMethod: 'POST',
            httpHeaders: {
              'Content-Type': 'application/json',
              'X-Webhook-Secret': secret,
            },
          },
        ],
      };

      const response = await fetch(`${this.baseUrl}/ISAPI/Event/notification/httpHosts`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Webhook setup failed: ${errorText}`);
        return { success: false, error: errorText };
      }

      this.logger.log(`Webhook configured successfully: ${webhookUrl}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Webhook setup error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

    return signature === expectedSignature;
  }

  async captureSnapshot(cameraId?: string): Promise<{
    success: boolean;
    imageData?: string;
    error?: string;
  }> {
    try {
      const endpoint = cameraId
        ? `/ISAPI/Streaming/channels/${cameraId}/picture`
        : '/ISAPI/Streaming/channels/1/picture';

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Snapshot capture failed: ${errorText}`);
        return { success: false, error: errorText };
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return {
        success: true,
        imageData: `data:${contentType};base64,${base64}`,
      };
    } catch (error) {
      this.logger.error('Snapshot capture error', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Digest Authentication methods
  private generateDigestAuth(method: string, uri: string, wwwAuth: string): string {
    const realm = this.extractFromAuth(wwwAuth, 'realm');
    const nonce = this.extractFromAuth(wwwAuth, 'nonce');
    const qop = this.extractFromAuth(wwwAuth, 'qop');
    const opaque = this.extractFromAuth(wwwAuth, 'opaque');

    const nc = '00000001';
    const cnonce = Math.random().toString(36).substring(2, 15);

    const ha1 = createHash('md5')
      .update(`${this.username}:${realm}:${this.password}`)
      .digest('hex');
    const ha2 = createHash('md5').update(`${method}:${uri}`).digest('hex');

    let response: string;
    if (qop) {
      response = createHash('md5')
        .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
        .digest('hex');
    } else {
      response = createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    }

    let digestHeader = `Digest username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;

    if (qop) {
      digestHeader += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    }

    if (opaque) {
      digestHeader += `, opaque="${opaque}"`;
    }

    return digestHeader;
  }

  private extractFromAuth(authHeader: string, key: string): string {
    const regex = new RegExp(`${key}="([^"]*)"`, 'i');
    const match = authHeader.match(regex);
    return match ? match[1] : '';
  }

  async testDigestAuth(): Promise<{ success: boolean; details: string }> {
    try {
      this.logger.debug('Testing Digest Authentication...');

      const firstResponse = await fetch(`${this.baseUrl}/ISAPI/System/deviceInfo`, {
        method: 'GET',
        headers: { Accept: 'application/xml' },
        signal: AbortSignal.timeout(10000),
      });

      if (firstResponse.status === 401) {
        const authHeader = firstResponse.headers.get('WWW-Authenticate');
        if (authHeader && authHeader.includes('Digest')) {
          const digestAuth = this.generateDigestAuth('GET', '/ISAPI/System/deviceInfo', authHeader);

          const authResponse = await fetch(`${this.baseUrl}/ISAPI/System/deviceInfo`, {
            method: 'GET',
            headers: {
              Authorization: digestAuth,
              Accept: 'application/xml',
            },
            signal: AbortSignal.timeout(10000),
          });

          const responseText = await authResponse.text();

          if (authResponse.ok) {
            this.logger.log(' Digest Authentication successful!');
            return {
              success: true,
              details: `Digest authentication successful! Response: ${responseText.substring(0, 200)}...`,
            };
          } else {
            return {
              success: false,
              details: `Digest authentication failed with status ${authResponse.status}: ${responseText.substring(0, 200)}`,
            };
          }
        }
      }

      return {
        success: false,
        details: 'Device does not support Digest authentication',
      };
    } catch (error) {
      return {
        success: false,
        details: `Digest auth error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
