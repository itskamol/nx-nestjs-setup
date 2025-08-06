import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { createHmac } from 'crypto';

@Injectable()
export class HikvisionService {
  private readonly logger = new Logger(HikvisionService.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly configService: AppConfigService) {
    const config = this.configService.faceRecognition.hikvision;
    this.baseUrl = `http://${config.host}:${config.port}`;
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ISAPI/Security/userCheck`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
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
}
