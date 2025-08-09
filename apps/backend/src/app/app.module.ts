import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// Configuration
import { AppConfigService, ConfigModule } from './config';

// Database
import { DatabaseModule } from './database';

// Common modules
import {
  CacheModule,
  HealthCheckService,
  JwtAuthGuard,
  LoggerModule,
  SecurityMiddleware,
  ServicesModule,
  // WebSocketModule,
} from './common';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeviceModule } from './device/device.module';
import { HikvisionModule } from './hikvision/hikvision.module';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';

// Controllers and Services
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration (must be first)
    ConfigModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // requests per minute
      },
    ]),

    // Core modules
    DatabaseModule,
    LoggerModule,
    CacheModule,
    ServicesModule,

    // Feature modules
    AuthModule,
    UsersModule,
    FaceRecognitionModule,
    // WebSocketModule,
    DeviceModule,
    HikvisionModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppConfigService,
    HealthCheckService,
    SecurityMiddleware,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware).forRoutes('*path'); // Apply to all routes using new syntax
  }
}
