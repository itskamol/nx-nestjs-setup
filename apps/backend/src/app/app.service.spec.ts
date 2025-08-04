import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { AppConfigService } from './config/config.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const mockConfigService = {
      nodeEnv: 'test',
      port: 3000,
      apiPrefix: 'api',
      isDevelopment: false,
    };

    const app = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return application information', () => {
      const result = service.getHello();

      expect(result).toEqual({
        name: 'NestJS Backend API',
        version: expect.any(String),
        description: 'A production-ready NestJS backend with best practices',
        environment: 'test',
        timestamp: expect.any(String),
        documentation: undefined, // Not development mode
      });
    });
  });
});
