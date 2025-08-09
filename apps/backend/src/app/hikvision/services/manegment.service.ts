import { HikvisionHttpService } from './hikvision.service';
import { EncryptionService, XmlService } from '@backend/app/common';
import { Device } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeviceManagementService {
  private readonly logger = new Logger(DeviceManagementService.name);
  constructor(
    private readonly hikvisionService: HikvisionHttpService,
    private readonly xmlService: XmlService,
    private readonly encryptionService: EncryptionService
  ) {}

  async getEventListener(device: Device): Promise<unknown> {
    const decryptedPassword = this.encryptionService.decrypt(device.password);
    return this.xmlService.convertToJSON(
      await this.hikvisionService.get({ ...device, password: decryptedPassword }, `/ISAPI/Event/notification/httpHosts`)
    );
  }

  async deleteEventListener(device: Device): Promise<unknown> {
    const decryptedPassword = this.encryptionService.decrypt(device.password);
    return this.xmlService.convertToJSON(
      await this.hikvisionService.delete({ ...device, password: decryptedPassword }, `/ISAPI/Event/notification/httpHosts`)
    );
  }

  async deleteEventListeners(devices: Device[]): Promise<unknown[]> {
    return Promise.all(devices.map(device => this.deleteEventListener(device)));
  }

  async getEventListeners(devices: Device[]): Promise<unknown[]> {
    return Promise.all(devices.map(device => this.getEventListener(device)));
  }

  async setEventListener(device: Device, url: string): Promise<any> {
    const decryptedPassword = this.encryptionService.decrypt(device.password);

    const payloadObj = {
      HttpHostNotificationList: {
        HttpHostNotification: {
          '@xmlns': 'http://www.isapi.org/ver20/XMLSchema',
          id: 2,
          url,
          protocolType: 'HTTP',
          parameterFormatType: 'JSON',
          addressingFormatType: 'ipaddress',
          ipAddress: '192.168.100.225',
          portNo: 3001,
          SubscribeEvent: {
            eventMode: 'all',
            EventList: [
              {
                Event: {
                  type: 'mixedTargetDetection',
                },
              },
            ],
          },
        },
      },
    } as const;

    const payload = await this.xmlService.convertToXML(payloadObj);

    this.logger.debug(`Event listener payload for device ${device.id}: ${payload}`);

    const resultXML = this.hikvisionService.put(
      { ...device, password: decryptedPassword },
      '/ISAPI/Event/notification/httpHosts',
      payload,
      {
        headers: { 'Content-Type': 'application/xml' },
      }
    );

    return resultXML
  }

  async bulkSetEventListener(devices: Device[], url: string): Promise<unknown[]> {
    try {
      return await Promise.all(devices.map(device => this.setEventListener(device, url)));
    } catch (error) {
      this.logger.error('Error setting event listeners', error as Error);
      return [];
    }
  }

  async testEventListener(device: Device, hostId: number): Promise<unknown> {
    const decryptedPassword = this.encryptionService.decrypt(device.password);
    const result = await this.hikvisionService.post({ ...device, password: decryptedPassword }, `/ISAPI/Event/notification/httpHosts/${hostId}/test`, undefined)
    return result
  }
}
