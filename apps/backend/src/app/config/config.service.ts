import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  AppConfig,
  DatabaseConfig,
  FaceRecognitionConfig,
  JwtConfig,
  LoggingConfig,
  RedisConfig,
} from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService) {}

  get port(): number {
    const config = this.configService.get<AppConfig>('app');
    return config?.port || 3000;
  }

  get nodeEnv(): string {
    const config = this.configService.get<AppConfig>('app');
    return config?.nodeEnv || 'development';
  }

  get apiPrefix(): string {
    const config = this.configService.get<AppConfig>('app');
    return config?.apiPrefix || 'api';
  }

  get corsOrigins(): string[] {
    const config = this.configService.get<AppConfig>('app');
    return config?.corsOrigins || ['http://localhost:3000'];
  }

  get database(): DatabaseConfig {
    const config = this.configService.get<AppConfig>('app');
    return (
      config?.database || {
        url: 'postgresql://user:password@localhost:5432/nestjs_backend',
        maxConnections: 10,
        ssl: false,
      }
    );
  }

  get jwt(): JwtConfig {
    const config = this.configService.get<AppConfig>('app');
    return (
      config?.jwt || {
        secret: 'default-secret',
        expiresIn: '15m',
        refreshSecret: 'default-refresh-secret',
        refreshExpiresIn: '7d',
      }
    );
  }

  get redis(): RedisConfig {
    const config = this.configService.get<AppConfig>('app');
    return (
      config?.redis || {
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0,
      }
    );
  }

  get logging(): LoggingConfig {
    const config = this.configService.get<AppConfig>('app');
    return (
      config?.logging || {
        level: 'info',
        enableFileLogging: false,
        maxFiles: '14d',
        maxSize: '20m',
      }
    );
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isStaging(): boolean {
    return this.nodeEnv === 'staging';
  }

  get faceRecognition(): FaceRecognitionConfig {
    const config = this.configService.get<AppConfig>('app');
    return (
      config?.faceRecognition || {
        enabled: false,
        hikvision: {
          host: '192.168.1.100',
          port: 80,
          username: 'admin',
          password: 'password',
        },
        webhook: {
          secret: 'your-webhook-secret',
          endpoint: '/api/face-recognition/webhook',
        },
        storage: {
          retentionDays: 30,
          maxRecords: 10000,
        },
      }
    );
  }
}
