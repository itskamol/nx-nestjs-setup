import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Configuration
import { ConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';

// Database
import { DatabaseModule } from './database/database.module';

// Common modules
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './common/cache/cache.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Guards
import { JwtAuthGuard } from './common/guards/auth.guard';

// Interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Middleware
import { SecurityMiddleware } from './common/middleware/security.middleware';

// Services
import { HealthCheckService } from './common/services/health-check.service';

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

    // Feature modules
    AuthModule,
    UsersModule,
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
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*path'); // Apply to all routes using new syntax
  }
}
