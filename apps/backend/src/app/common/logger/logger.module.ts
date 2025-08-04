import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { AppConfigService } from '../../config/config.service';

@Global()
@Module({
  providers: [LoggerService, AppConfigService],
  exports: [LoggerService],
})
export class LoggerModule {}
