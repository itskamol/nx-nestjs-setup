import { Injectable } from '@nestjs/common';
import { AppConfigService } from './config/config.service';

@Injectable()
export class AppService {
  constructor(private readonly configService: AppConfigService) {}

  getHello() {
    return {
      name: 'NestJS Backend API',
      version: process.env['npm_package_version'] || '1.0.0',
      description: 'A production-ready NestJS backend with best practices',
      environment: this.configService.nodeEnv,
      timestamp: new Date().toISOString(),
      documentation: this.configService.isDevelopment 
        ? `http://localhost:${this.configService.port}/${this.configService.apiPrefix}/docs`
        : undefined,
    };
  }
}