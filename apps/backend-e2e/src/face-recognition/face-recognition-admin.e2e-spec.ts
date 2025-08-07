import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@backend/app/app.module';
import { TransformInterceptor } from '@backend/app/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '@backend/app/common/filters/global-exception.filter';
import { EnhancedTestDatabaseManager } from '../utils/enhanced-test-database.setup';
import { AuthUtils } from '../utils/auth-utils';
import { DataFactory } from '../utils/data-factory';
import { TestHelpers } from '../utils/test-helpers';
import { Role } from '@shared/types';

describe('Face Recognition Admin and Integration E2E Tests', () => {
  let app: INestApplication;
  let dbManager: EnhancedTestDatabaseManager;
  let authUtils: AuthUtils;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as main.ts
    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    // Global filters and interceptors
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    // Initialize test utilities
    dbManager = EnhancedTestDatabaseManager.getInstance();
    await dbManager.setupDatabase();
    authUtils = new AuthUtils();
  });

  afterAll(async () => {
    if (dbManager) {
      await dbManager.teardownDatabase();
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await dbManager.cleanDatabase();
  });

  afterEach(async () => {
    await TestHelpers.cleanupTestData();
  });
  describe('POST /api/face-recognition/test-connection - Test Hikvision Connection', () => {
    it('should test connection as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');

      if (data.message) {
        expect(typeof data.message).toBe('string');
      }
    });

    it('should fail to test connection as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to test connection as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle connection failure gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // The actual connection might fail in test environment, but endpoint should handle it
      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data).toHaveProperty('success');

      if (!data.success) {
        expect(data).toHaveProperty('message');
        expect(typeof data.message).toBe('string');
      }
    });

    it('should have reasonable response time', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(response, 10000); // 10 seconds max for connection test
    });
  });

  describe('GET /api/face-recognition/faces/list - Get Hikvision Face List', () => {
    it('should get face list as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/faces/list')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');

      if (data.success && data.faces) {
        expect(Array.isArray(data.faces)).toBe(true);

        if (data.faces.length > 0) {
          data.faces.forEach(face => {
            expect(face).toHaveProperty('faceId');
            expect(face).toHaveProperty('name');
            expect(face).toHaveProperty('createTime');
          });
        }
      }

      if (data.error) {
        expect(typeof data.error).toBe('string');
      }
    });

    it('should get face list as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/faces/list')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
    });

    it('should fail to get face list as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/faces/list')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/faces/list')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle Hikvision service errors gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/faces/list')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data).toHaveProperty('success');

      // Should handle both success and error cases gracefully
      if (!data.success) {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });
  });
  describe('POST /api/face-recognition/webhook - Handle Webhook Events', () => {
    it('should handle valid webhook event', async () => {
      const webhookData = DataFactory.createFaceWebhookData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/webhook')
        .send(webhookData)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('success', true);
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      const webhookData = DataFactory.createFaceWebhookData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/webhook')
        .send(webhookData)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
    });

    it('should fail with invalid webhook signature', async () => {
      const webhookData = DataFactory.createFaceWebhookData({
        signature: 'invalid-signature',
      });

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/webhook')
        .send(webhookData)
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should validate required webhook fields', async () => {
      const requiredFields = ['eventType', 'faceId', 'confidence', 'timestamp', 'signature'];

      for (const field of requiredFields) {
        const webhookData = DataFactory.createFaceWebhookData();
        delete webhookData[field];

        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/webhook')
          .send(webhookData)
          .expect(400);

        TestHelpers.expectValidationError(response, field);
      }
    });

    it('should handle different event types', async () => {
      const eventTypes = ['FACE_DETECTED', 'FACE_RECOGNIZED', 'FACE_UNKNOWN'];

      for (const eventType of eventTypes) {
        const webhookData = DataFactory.createFaceWebhookData({
          eventType,
        });

        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/webhook')
          .send(webhookData)
          .expect(200);

        TestHelpers.expectSuccessResponse(response);
      }
    });

    it('should validate confidence range in webhook', async () => {
      const invalidConfidences = [-0.1, 1.1, 2.0, -1.0];

      for (const confidence of invalidConfidences) {
        const webhookData = DataFactory.createFaceWebhookData({
          confidence,
        });

        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/webhook')
          .send(webhookData)
          .expect(400);

        TestHelpers.expectValidationError(response, 'confidence');
      }
    });

    it('should handle webhook with metadata', async () => {
      const webhookData = DataFactory.createFaceWebhookData({
        metadata: {
          deviceId: 'camera-001',
          temperature: 36.5,
          customField: 'test-value',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/webhook')
        .send(webhookData)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
    });

    it('should handle concurrent webhook requests', async () => {
      const webhookRequests = Array.from({ length: 3 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/face-recognition/webhook')
          .send(
            DataFactory.createFaceWebhookData({
              faceId: `concurrent-face-${i}`,
            })
          )
      );

      const responses = await Promise.all(webhookRequests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestHelpers.expectSuccessResponse(response);
      });
    });

    it('should have reasonable response time for webhook processing', async () => {
      const webhookData = DataFactory.createFaceWebhookData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/webhook')
        .send(webhookData)
        .expect(200);

      TestHelpers.expectResponseTime(response, 5000); // 5 seconds max for webhook processing
    });
  });

  describe('POST /api/face-recognition/cleanup - Cleanup Old Records', () => {
    it('should cleanup old records as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create some test records first
      const testUser = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(testUser.id, 5);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/cleanup')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('cleanedCount');
      expect(typeof data.cleanedCount).toBe('number');
      expect(data.cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it('should fail to cleanup as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/cleanup')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to cleanup as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/cleanup')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/cleanup')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle cleanup when no old records exist', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Ensure no old records exist
      await dbManager.cleanDatabase();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/cleanup')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data.success).toBe(true);
      expect(data.cleanedCount).toBe(0);
    });
  });

  describe('POST /api/face-recognition/snapshot - Capture Camera Snapshot', () => {
    it('should capture snapshot as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/snapshot')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');

      if (data.success && data.imageData) {
        expect(typeof data.imageData).toBe('string');
        // Should be base64 encoded image
        expect(data.imageData).toMatch(/^data:image\/(jpeg|png);base64,/);
      }

      if (data.error) {
        expect(typeof data.error).toBe('string');
      }
    });

    it('should capture snapshot as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/snapshot')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
    });

    it('should fail to capture snapshot as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/snapshot')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/snapshot')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should support camera ID parameter', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/snapshot')
        .query({ cameraId: 'camera-001' })
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
    });

    it('should handle camera connection errors gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/snapshot')
        .query({ cameraId: 'non-existent-camera' })
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data).toHaveProperty('success');

      // Should handle camera errors gracefully
      if (!data.success) {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });
  });
  describe('POST /api/face-recognition/setup-webhook - Setup Webhook Configuration', () => {
    it('should setup webhook as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/setup-webhook')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');

      if (data.error) {
        expect(typeof data.error).toBe('string');
      }
    });

    it('should fail to setup webhook as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/setup-webhook')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to setup webhook as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/setup-webhook')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/setup-webhook')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle webhook setup errors gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/setup-webhook')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data).toHaveProperty('success');

      // Should handle setup errors gracefully
      if (!data.success) {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });
  });

  describe('Face Recognition Integration Workflows', () => {
    it('should validate complete face recognition workflow', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      // Step 1: Test Hikvision connection
      const connectionResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .set(headers)
        .expect(200);

      expect(connectionResponse.body.data).toHaveProperty('success');

      // Step 2: Enroll a face
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: testUser.id,
      });

      const enrollResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      const enrolledFace = enrollResponse.body.data;

      // Step 3: Get face records
      const recordsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .set(headers)
        .expect(200);

      expect(recordsResponse.body.data.length).toBeGreaterThan(0);

      // Step 4: Get statistics
      const statsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      expect(statsResponse.body.data.totalFaceRecords).toBeGreaterThan(0);

      // Step 5: Try face recognition
      const recognizeResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: faceRecordData.imageData })
        .expect(200);

      expect(recognizeResponse.body.data).toHaveProperty('recognizedFaces');
      expect(recognizeResponse.body.data).toHaveProperty('unknownFaces');

      // Step 6: Update face record
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${enrolledFace.id}`)
        .set(headers)
        .send({ confidence: 0.99 })
        .expect(200);

      expect(updateResponse.body.data.confidence).toBe(0.99);

      // Step 7: Get events
      const eventsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(eventsResponse);

      // Step 8: Cleanup (optional)
      const cleanupResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/cleanup')
        .set(headers)
        .expect(200);

      expect(cleanupResponse.body.data).toHaveProperty('success', true);
    });

    it('should validate webhook integration workflow', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Step 1: Setup webhook
      const setupResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/setup-webhook')
        .set(headers)
        .expect(200);

      expect(setupResponse.body.data).toHaveProperty('success');

      // Step 2: Simulate webhook event
      const webhookData = DataFactory.createFaceWebhookData();

      const webhookResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/webhook')
        .send(webhookData)
        .expect(200);

      expect(webhookResponse.body.data).toHaveProperty('success', true);

      // Step 3: Check if event was processed (check events)
      const eventsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(eventsResponse);

      // Step 4: Check updated statistics
      const statsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      expect(statsResponse.body.data).toHaveProperty('totalEvents');
    });

    it('should handle role-based access across all face recognition endpoints', async () => {
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      // Test admin access (should have access to all endpoints)
      const { headers: adminHeaders } = await authUtils.createTestScenario(Role.ADMIN);

      const adminEndpoints = [
        {
          method: 'post',
          path: '/api/face-recognition/enroll',
          body: DataFactory.createFaceRecordData(),
        },
        { method: 'get', path: '/api/face-recognition/records' },
        { method: 'get', path: `/api/face-recognition/records/${faceRecord.id}` },
        {
          method: 'put',
          path: `/api/face-recognition/records/${faceRecord.id}`,
          body: { confidence: 0.99 },
        },
        { method: 'delete', path: `/api/face-recognition/records/${faceRecord.id}` },
        { method: 'get', path: '/api/face-recognition/events' },
        { method: 'get', path: '/api/face-recognition/stats' },
        { method: 'post', path: '/api/face-recognition/test-connection' },
        { method: 'get', path: '/api/face-recognition/faces/list' },
        { method: 'post', path: '/api/face-recognition/cleanup' },
        { method: 'post', path: '/api/face-recognition/snapshot' },
        { method: 'post', path: '/api/face-recognition/setup-webhook' },
      ];

      for (const endpoint of adminEndpoints) {
        const request_builder = request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set(adminHeaders);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder;
        expect([200, 201, 204]).toContain(response.status);
      }

      // Test moderator access (should have limited access)
      const { headers: moderatorHeaders } = await authUtils.createTestScenario(Role.MODERATOR);
      const newFaceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const moderatorAllowedEndpoints = [
        {
          method: 'post',
          path: '/api/face-recognition/enroll',
          body: DataFactory.createFaceRecordData(),
        },
        { method: 'get', path: '/api/face-recognition/records' },
        { method: 'get', path: `/api/face-recognition/records/${newFaceRecord.id}` },
        {
          method: 'put',
          path: `/api/face-recognition/records/${newFaceRecord.id}`,
          body: { confidence: 0.99 },
        },
        { method: 'get', path: '/api/face-recognition/events' },
        { method: 'get', path: '/api/face-recognition/stats' },
        { method: 'get', path: '/api/face-recognition/faces/list' },
        { method: 'post', path: '/api/face-recognition/snapshot' },
      ];

      for (const endpoint of moderatorAllowedEndpoints) {
        const request_builder = request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set(moderatorHeaders);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder;
        expect([200, 201, 204]).toContain(response.status);
      }

      // Test regular user access (should have minimal access)
      const { headers: userHeaders } = await authUtils.createTestScenario(Role.USER);

      const userAllowedEndpoints = [
        {
          method: 'post',
          path: '/api/face-recognition/recognize-base64',
          body: { imageData: DataFactory.createBase64ImageData() },
        },
        { method: 'get', path: '/api/face-recognition/records' },
        { method: 'get', path: '/api/face-recognition/events' },
        { method: 'get', path: '/api/face-recognition/stats' },
      ];

      for (const endpoint of userAllowedEndpoints) {
        const request_builder = request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set(userHeaders);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder;
        expect([200, 201]).toContain(response.status);
      }
    });
  });

  describe('Face Recognition Security and Performance', () => {
    it('should not expose sensitive data in admin responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const endpoints = [
        '/api/face-recognition/test-connection',
        '/api/face-recognition/faces/list',
        '/api/face-recognition/cleanup',
        '/api/face-recognition/snapshot',
        '/api/face-recognition/setup-webhook',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .post(endpoint.startsWith('/api/face-recognition/faces/list') ? 'get' : 'post')
          .set(headers);

        if (response.status === 200) {
          TestHelpers.expectNoSensitiveData(response);
        }
      }
    });

    it('should include security headers in all face recognition responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/test-connection')
        .set(headers)
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should handle high load scenarios', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create substantial test data
      const testUser = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(testUser.id, 50);

      // Test multiple concurrent requests
      const concurrentRequests = [
        request(app.getHttpServer()).get('/api/face-recognition/records').set(headers),
        request(app.getHttpServer()).get('/api/face-recognition/events').set(headers),
        request(app.getHttpServer()).get('/api/face-recognition/stats').set(headers),
      ];

      const responses = await Promise.all(concurrentRequests);

      // All should succeed with reasonable response times
      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestHelpers.expectResponseTime(response, 10000);
      });
    });
  });
});
