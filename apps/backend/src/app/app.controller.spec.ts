import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthCheckService } from './common/services/health-check.service';
import { AppConfigService } from './config/config.service';

describe('AppController', () => {
  let app: TestingModule;
  let appController: AppController;

  beforeAll(async () => {
    const mockAppService = {
      getHello: jest.fn().mockReturnValue({
        name: 'NestJS Backend API',
        version: '1.0.0',
        description: 'A production-ready NestJS backend with best practices',
        environment: 'test',
        timestamp: '2023-01-01T00:00:00.000Z',
      }),
    };

    const mockHealthCheckService = {
      getHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00.000Z',
        uptime: 1000,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: { status: 'healthy', responseTime: 10 },
          cache: { status: 'healthy', responseTime: 5 },
          memory: { status: 'healthy', details: { heapUsed: 50, heapTotal: 100, usagePercent: 50 } },
        },
      }),
      getDetailedHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00.000Z',
        uptime: 1000,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: { status: 'healthy', responseTime: 10 },
          cache: { status: 'healthy', responseTime: 5 },
          memory: { status: 'healthy', details: { heapUsed: 50, heapTotal: 100, usagePercent: 50 } },
        },
      }),
    };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHello', () => {
    it('should return application information', () => {
      const result = appController.getHello();
      expect(result).toEqual({
        name: 'NestJS Backend API',
        version: '1.0.0',
        description: 'A production-ready NestJS backend with best practices',
        environment: 'test',
        timestamp: '2023-01-01T00:00:00.000Z',
      });
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const result = await appController.getHealth();
      expect(result.status).toBe('healthy');
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health status', async () => {
      const result = await appController.getDetailedHealth();
      expect(result.status).toBe('healthy');
    });
  });
});
