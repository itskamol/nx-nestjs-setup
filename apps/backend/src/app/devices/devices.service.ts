import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDeviceDto, CreateDeviceResponseDto, DeviceResponseDto } from './dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DevicesService {
  private readonly saltRounds = 10;

  constructor(private readonly prisma: PrismaService) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<CreateDeviceResponseDto> {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = await bcrypt.hash(apiKey, this.saltRounds);

    const device = await this.prisma.device.create({
      data: {
        name: createDeviceDto.name,
        deviceId: createDeviceDto.deviceId,
        location: createDeviceDto.location,
        ipAddress: createDeviceDto.ipAddress,
        apiKeyHash,
      },
    });

    return {
        ...this.mapToDeviceResponseDto(device),
        apiKey, // Return the unhashed key only on creation
    };
  }

  async findAll(): Promise<DeviceResponseDto[]> {
    const devices = await this.prisma.device.findMany();
    return devices.map(this.mapToDeviceResponseDto);
  }

  async findOne(id: number): Promise<DeviceResponseDto> {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return this.mapToDeviceResponseDto(device);
  }

  async findByDeviceId(deviceId: string) {
    return this.prisma.device.findUnique({ where: { deviceId } });
  }

  async update(id: number, updateDeviceDto: Partial<CreateDeviceDto>): Promise<DeviceResponseDto> {
    const device = await this.prisma.device.update({
      where: { id },
      data: updateDeviceDto,
    });
    return this.mapToDeviceResponseDto(device);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.device.delete({ where: { id } });
  }

  private mapToDeviceResponseDto(device): DeviceResponseDto {
      return {
          id: device.id,
          name: device.name,
          deviceId: device.deviceId,
          location: device.location,
          ipAddress: device.ipAddress,
          status: device.status,
          firmwareVersion: device.firmwareVersion,
          lastSeenAt: device.lastSeenAt,
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
      }
  }
}
