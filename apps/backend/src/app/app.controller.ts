import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { HealthCheckService } from './common/services/health-check.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthCheckService: HealthCheckService
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({
    status: 200,
    description: 'Application information',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'NestJS Backend API' },
            version: { type: 'string', example: '1.0.0' },
            description: { type: 'string', example: 'A production-ready NestJS backend' },
            environment: { type: 'string', example: 'development' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  getHello() {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application health status',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', description: 'Uptime in milliseconds' },
            version: { type: 'string' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    responseTime: { type: 'number' },
                  },
                },
                cache: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    responseTime: { type: 'number' },
                  },
                },
                memory: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    details: {
                      type: 'object',
                      properties: {
                        heapUsed: { type: 'number' },
                        heapTotal: { type: 'number' },
                        usagePercent: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getHealth() {
    return this.healthCheckService.getHealthStatus();
  }

  @Get('health/detailed')
  @Public()
  @ApiOperation({ summary: 'Detailed health check with system information' })
  @ApiResponse({
    status: 200,
    description: 'Detailed application health status',
  })
  async getDetailedHealth() {
    return this.healthCheckService.getDetailedHealthStatus();
  }
}