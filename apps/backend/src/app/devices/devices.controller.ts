import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto, CreateDeviceResponseDto, DeviceResponseDto, HeartbeatDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('heartbeat')
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Device heartbeat' })
  @ApiHeader({ name: 'x-api-key', description: 'The API key for the device.' })
  @ApiResponse({ status: 204, description: 'Heartbeat received.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(@Body() heartbeatDto: HeartbeatDto): Promise<void> {
    await this.devicesService.updateLastSeen(heartbeatDto.deviceId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({ status: 201, description: 'The device has been successfully created.', type: CreateDeviceResponseDto })
  create(@Body() createDeviceDto: CreateDeviceDto): Promise<CreateDeviceResponseDto> {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get a list of all devices' })
  @ApiResponse({ status: 200, description: 'List of all devices.', type: [DeviceResponseDto] })
  findAll(): Promise<DeviceResponseDto[]> {
    return this.devicesService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get a specific device by ID' })
  @ApiResponse({ status: 200, description: 'The device data.', type: DeviceResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<DeviceResponseDto> {
    return this.devicesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a device' })
  @ApiResponse({ status: 200, description: 'The device has been successfully updated.', type: DeviceResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDeviceDto: Partial<CreateDeviceDto>,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a device' })
  @ApiResponse({ status: 204, description: 'The device has been successfully deleted.' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.devicesService.remove(id);
  }
}
