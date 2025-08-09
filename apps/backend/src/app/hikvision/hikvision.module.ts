import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HikvisionHttpService } from './hikvision-http.service';

@Module({
  imports: [HttpModule],
  providers: [HikvisionHttpService],
  exports: [HikvisionHttpService],
})
export class HikvisionModule {}
