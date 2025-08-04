import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AppConfig, DatabaseConfig, JwtConfig, RedisConfig, LoggingConfig } from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService<AppConfig>) {}

  get port(): number {
    const config = (this.configService as any).get('app');
    return config?.port || 3000;
  }

  get nodeEnv(): string {
    const config = (this.configService as any).get('app');
    return config?.nodeEnv || 'development';
  }

  get apiPrefix(): string {
    const config = (this.configService as any).get('app');
    return config?.apiPrefix || 'api';
  }

  get corsOrigins(): string[] {
    const config = (this.configService as any).get('app');
    return config?.corsOrigins || ['http://localhost:3000'];
  }

  get database(): DatabaseConfig {
    const config = (this.configService as any).get('app');
    return config?.database || {
      url: 'postgresql://user:password@localhost:5432/nestjs_backend',
      maxConnections: 10,
      ssl: false,
    };
  }

  get jwt(): JwtConfig {
    const config = (this.configService as any).get('app');
    return config?.jwt || {
      secret: 'default-secret',
      expiresIn: '15m',
      refreshSecret: 'default-refresh-secret',
      refreshExpiresIn: '7d',
    };
  }

  get redis(): RedisConfig {
    const config = (this.configService as any).get('app');
    return config?.redis || {
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 0,
    };
  }

  get logging(): LoggingConfig {
    const config = (this.configService as any).get('app');
    return config?.logging || {
      level: 'info',
      enableFileLogging: false,
      maxFiles: '14d',
      maxSize: '20m',
    };
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
}