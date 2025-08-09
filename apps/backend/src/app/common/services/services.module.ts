import { Global, Module } from '@nestjs/common';
import { CacheWarmingService } from './cache-warming.service';
import { ErrorMonitoringService } from './error-monitoring.service';
import { HealthCheckService } from './health-check.service';
import { PasswordService } from './password.service';
import { UsersModule } from '@backend/app/users/users.module';
import { EncryptionService } from './encryption.service';
import { XmlService } from './xml.service';

@Global()
@Module({
  imports: [UsersModule],
  providers: [CacheWarmingService, ErrorMonitoringService, HealthCheckService, PasswordService, EncryptionService, XmlService],
  exports: [CacheWarmingService, ErrorMonitoringService, HealthCheckService, PasswordService, EncryptionService, XmlService],
})
export class ServicesModule {}
