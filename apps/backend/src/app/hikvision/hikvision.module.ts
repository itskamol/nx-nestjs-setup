import { Module } from '@nestjs/common';
import { HikvisionHttpService } from './services';
import { HttpModule } from '@nestjs/axios';
import { HikvisionController } from './controllers';
import { DeviceManagementService } from './services/manegment.service';
import { DeviceService } from '../device/services/device.service';

@Module({
  imports: [HttpModule],
  providers: [HikvisionHttpService, DeviceManagementService, DeviceService],
  controllers: [HikvisionController],
  exports: [HikvisionHttpService, DeviceManagementService],
})
export class HikvisionModule {}
