import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeviceService } from '../services/device.service';
import { CreateDeviceDto } from '../dto/device.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '@backend/app/common';
import { Device, Role } from '@prisma/client';

@ApiTags('Devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({
    status: 201,
    description: 'The device has been successfully created.',
    type: CreateDeviceDto,
  })
  async create(@Body() createDeviceDto: CreateDeviceDto): Promise<any> {
    return this.deviceService.create(createDeviceDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({
    status: 200,
    description: 'List of all devices',
  })
  async findAll(): Promise<Device[]> {
    return this.deviceService.findAll({ omit: { password: true } });
  }
}
