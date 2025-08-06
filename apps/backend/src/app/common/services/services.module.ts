import { Global, Module } from '@nestjs/common';
import { CacheWarmingService } from './cache-warming.service';
import { ErrorMonitoringService } from './error-monitoring.service';
import { HealthCheckService } from './health-check.service';
import { PasswordService } from './password.service';
import { UsersModule } from '@backend/app/users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [CacheWarmingService, ErrorMonitoringService, HealthCheckService, PasswordService],
  exports: [CacheWarmingService, ErrorMonitoringService, HealthCheckService, PasswordService],
})
export class ServicesModule {}
