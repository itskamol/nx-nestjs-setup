import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../backend/src/app/app.module';
import { AuthUtils } from '../utils/auth-utils';
import { EnhancedTestDatabaseManager } from '../utils/enhanced-test-database.setup';
import { DevicesService } from '../../../backend/src/app/devices/devices.service';

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let dbManager: EnhancedTestDatabaseManager;
  let authUtils: AuthUtils;
  let devicesService: DevicesService;
  let adminHeaders: Record<string, string>;
  let userHeaders: Record<string, string>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    dbManager = EnhancedTestDatabaseManager.getInstance();
    await dbManager.setupDatabase();
    authUtils = new AuthUtils();
    devicesService = app.get<DevicesService>(DevicesService);

    const headers = await authUtils.createAuthHeadersForRoles();
    adminHeaders = headers.adminHeaders;
    userHeaders = headers.userHeaders;
  });

  afterAll(async () => {
    await dbManager.teardownDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await dbManager.cleanDatabase();
  });

  describe('POST /api/devices', () => {
    it('should not allow a regular user to create a device', async () => {
      const createDeviceDto = { name: 'Test Device', deviceId: 'test-001' };
      await request(app.getHttpServer())
        .post('/api/devices')
        .set(userHeaders)
        .send(createDeviceDto)
        .expect(403);
    });

    it('should allow an admin to create a device', async () => {
      const createDeviceDto = { name: 'Test Device', deviceId: 'test-001', location: 'Lab A' };
      const response = await request(app.getHttpServer())
        .post('/api/devices')
        .set(adminHeaders)
        .send(createDeviceDto)
        .expect(201);

      expect(response.body.data.name).toEqual(createDeviceDto.name);
      expect(response.body.data.deviceId).toEqual(createDeviceDto.deviceId);
      expect(response.body.data.apiKey).toBeDefined();
    });
  });

  describe('POST /api/devices/heartbeat', () => {
    let device;
    let apiKey;

    beforeEach(async () => {
        const createDeviceDto = { name: 'Heartbeat Device', deviceId: 'heartbeat-001' };
        const response = await devicesService.create(createDeviceDto);
        device = response;
        apiKey = response.apiKey;
    });

    it('should fail without an api key', async () => {
        await request(app.getHttpServer())
            .post('/api/devices/heartbeat')
            .send({ deviceId: device.deviceId })
            .expect(401);
    });

    it('should succeed with a valid api key', async () => {
        await request(app.getHttpServer())
            .post('/api/devices/heartbeat')
            .set('x-api-key', apiKey)
            .send({ deviceId: device.deviceId })
            .expect(204);

        const updatedDevice = await dbManager.findDeviceById(device.id);
        expect(updatedDevice.lastSeenAt).not.toBeNull();
    });
  });
});
