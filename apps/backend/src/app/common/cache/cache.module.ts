import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { AppConfigService } from '../../config/config.service';

@Global()
@Module({
  providers: [CacheService, AppConfigService],
  exports: [CacheService],
})
export class CacheModule {}