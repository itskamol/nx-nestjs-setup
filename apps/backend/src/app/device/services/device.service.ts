import { EncryptionService } from '@backend/app/common';
import { PrismaService } from '@backend/app/database';
import { HikvisionHttpService } from '@backend/app/hikvision/services';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CreateDeviceDto } from '../dto/device.dto';
import { IDevice } from '../interfaces/device.interface';
import { Device, Prisma } from '@prisma/client';

export class DeviceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly encryptionService: EncryptionService,

    @Inject(HikvisionHttpService)
    private readonly hikvisionService: HikvisionHttpService
  ) {}

  async findOneAndDecrypt(id: number): Promise<IDevice> {
    const device = await this.prismaService.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException();
    }

    // Parolni deshifrlash
    const decryptedPassword = this.encryptionService.decrypt(device.password);

    return {
      host: device.host,
      port: device.port,
      username: device.username,
      password: decryptedPassword,
    };
  }

  async create(deviceData: CreateDeviceDto): Promise<any> {
    const deviceInfo = await this.getDeviceInfo(deviceData);

    if (!deviceInfo) {
      throw new NotFoundException(
        'Failed to retrieve device information or your credentials are incorrect'
      );
    }

    const {
      deviceName,
      deviceID,
      model,
      serialNumber,
      macAddress,
      firmwareVersion,
      deviceType,
    }: any = this.parseDeviceInfo(deviceInfo);

    const device = await this.findOne({
      where: { serialNumber },
    });

    if (device) {
      throw new ConflictException('Device already exists');
    }

    const metadata = await this.getDeviceCapabilities(deviceData);

    const encryptedPassword = this.encryptionService.encrypt(deviceData.password);

    const newDevice = this.prismaService.device.create({
      data: {
        name: deviceData.name,
        host: deviceData.host,
        port: deviceData.port,
        username: deviceData.username,
        password: encryptedPassword,
        metadata,
        deviceID,
        deviceName,
        model,
        serialNumber,
        macAddress,
        firmwareVersion,
        deviceType,
      },
    });

    return newDevice;
  }

  async findAll(options: Prisma.DeviceFindManyArgs = {}): Promise<Device[]> {
    const devices = await this.prismaService.device.findMany({
      ...options,
    });

    return devices;
  }

  async findOne(args: Prisma.DeviceFindUniqueArgs): Promise<Device | null> {
    return this.prismaService.device.findUnique({
      ...args,
    });
  }

  private async getDeviceInfo(deviceData: CreateDeviceDto): Promise<any> {
    const deviceInfo = (await this.hikvisionService.getDeviceInfo(deviceData)) || null;

    if ('DeviceInfo' in deviceInfo) {
      return deviceInfo.DeviceInfo;
    }

    return null;
  }

  private parseDeviceInfo(deviceInfo: { children: object[] }): object {
    const data = {};
    deviceInfo.children.forEach((child: any) => {
      Object.entries(child).forEach(([key, value]) => {
        data[key] = (value as { content: unknown }).content;
      });
    });
    return data;
  }

  private async getDeviceCapabilities(deviceInfo: IDevice): Promise<any> {
    return this.hikvisionService.getDeviceCapabilities(deviceInfo);
  }
}
