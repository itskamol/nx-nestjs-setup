import { Module } from '@nestjs/common';
import { DeviceController } from './controllers/device.controller';
import { DeviceService } from './services/device.service';
import { HikvisionModule } from '../hikvision/hikvision.module';

@Module({
  imports: [HikvisionModule],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
