import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Logger,
  ParseArrayPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard, Public, RolesGuard } from '@backend/app/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DeviceManagementService } from '../services/manegment.service';
import { CreateEventListenerDto } from '../dto/hikvision.dto';
import { DeviceService } from '@backend/app/device/services/device.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@ApiTags('Hikvision')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hikvision')
export class HikvisionController {
  private readonly logger = new Logger(HikvisionController.name);
  constructor(
    private readonly managementService: DeviceManagementService,
    private readonly deviceService: DeviceService
  ) {}

  @ApiOperation({
    summary: 'Create a new event listener',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({
    description: 'Create a new event listener for Hikvision devices',
    type: CreateEventListenerDto,
  })
  @Post('event-listener')
  async createEventListener(@Body() createEventListenerDto: CreateEventListenerDto) {
    const { devices: deviceIDs, url } = createEventListenerDto;

    const devices = await this.deviceService.findAll({
      where: {
        id: {
          in: deviceIDs,
        },
      },
    });

    return this.managementService.bulkSetEventListener(devices, url);
  }

  @ApiOperation({
    summary: 'webhook for Hikvision devices',
  })
  @Public()
  @Post('webhook')
  @HttpCode(200) // Qurilmaga har doim 200 OK javobini qaytarish muhim
  @Header('Connection', 'close') // ISAPI hujjatiga ko'ra ulanishni yopish tavsiya etiladi [cite: 224, 233]
  @UseInterceptors(AnyFilesInterceptor())
  async createWebhook(@Req() req: any) {
    console.log(JSON.parse(req.body.event_log));
    // this.logger.debug(`Webhook received: ${req.body}`);
    return { message: 'Webhook received successfully' };
  }

  @ApiOperation({
    summary: 'Get event listeners for Hikvision devices',
  })
  @ApiQuery({
    name: 'devices',
    type: [Number],
    required: false,
    description: 'The IDs of the Hikvision devices',
  })
  @Get('event-listener')
  async getEventListener(
    @Query('devices', new ParseArrayPipe({ items: Number, separator: ',', optional: false }))
    devices: number[]
  ) {
    const devicesInDb = await this.deviceService.findAll({
      where: {
        id: {
          in: devices,
        },
      },
    });

    return this.managementService.getEventListeners(devicesInDb);
  }

  @Delete('event-listener')
  @ApiOperation({
    summary: 'Delete event listeners for Hikvision devices',
  })
  @ApiQuery({
    name: 'devices',
    type: [Number],
    required: true,
    description: 'The IDs of the Hikvision devices',
  })
  async deleteEventListener(
    @Query('devices', new ParseArrayPipe({ items: Number, separator: ',', optional: false }))
    devices: number[]
  ) {
    const devicesInDb = await this.deviceService.findAll({
      where: {
        id: {
          in: devices,
        },
      },
    });

    return this.managementService.deleteEventListeners(devicesInDb);
  }

  @ApiOperation({
    summary: 'Test event listener for a Hikvision device',
  })
  @ApiQuery({
    name: 'deviceId',
    type: Number,
    required: true,
    description: 'The ID of the Hikvision device',
  })
  @ApiQuery({
    name: 'hostId',
    type: Number,
    required: true,
    description: 'The ID of the host',
  })
  @Post('event-listener/test')
  async testEventListener(
    @Query('deviceId') deviceId: number,
    @Query('hostId') hostId: number
  ) {
    const device = await this.deviceService.findOne({
      where: {
        id: +deviceId,
      },
    });

    return this.managementService.testEventListener(device, hostId);
  }
}
