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

describe('Face Events and Statistics E2E Tests', () => {
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
  describe('GET /api/face-recognition/events - Get Face Recognition Events', () => {
    it('should get paginated face events for authenticated users', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create test face events
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      await dbManager.seedFaceEvents(faceRecord.id, 5);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data, pagination } = response.body;
      expect(Array.isArray(data)).toBe(true);
      expect(pagination.total).toBeGreaterThan(0);

      // Validate face event structure
      if (data.length > 0) {
        data.forEach(event => {
          expect(event).toHaveProperty('id');
          expect(event).toHaveProperty('eventType');
          expect(event).toHaveProperty('confidence');
          expect(event).toHaveProperty('timestamp');
          TestHelpers.expectValidDateString(event.timestamp);
        });
      }
    });

    it('should support pagination parameters', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create test face events
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      await dbManager.seedFaceEvents(faceRecord.id, 10);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .query({ page: 1, limit: 5 })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 5);

      const { pagination } = response.body;
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(5);
      expect(pagination.total).toBeGreaterThan(5);
    });

    it('should support filtering by faceRecordId', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create face events for different records
      const testUser = await dbManager.createTestUser();
      const faceRecord1 = await dbManager.createTestFaceRecord(testUser.id);
      const faceRecord2 = await dbManager.createTestFaceRecord(testUser.id);
      await dbManager.seedFaceEvents(faceRecord1.id, 3);
      await dbManager.seedFaceEvents(faceRecord2.id, 2);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .query({ faceRecordId: faceRecord1.id })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      data.forEach(event => {
        expect(event.faceRecordId).toBe(faceRecord1.id);
      });
    });

    it('should support filtering by faceId', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .query({ faceId: 'specific-face-id' })
        .set(headers)
        .expect(200);
      TestHelpers.expectPaginatedResponse(response);
      const { data } = response.body;
      expect(data).toHaveLength(1);
      expect(data[0].faceId).toBe('specific-face-id');
    });

    it('should support filtering by eventType', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create face events with different types
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      await dbManager.createTestFaceEvent(faceRecord.id, {
        eventType: 'DETECTED',
      });
      await dbManager.createTestFaceEvent(faceRecord.id, {
        eventType: 'RECOGNIZED',
      });

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .query({ eventType: 'DETECTED' })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      data.forEach(event => {
        expect(event.eventType).toBe('DETECTED');
      });
    });

    it('should support date range filtering', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create face events with different timestamps
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      await dbManager.createTestFaceEvent(faceRecord.id, {
        timestamp: new Date('2024-01-15T12:00:00Z'),
      });
      await dbManager.createTestFaceEvent(faceRecord.id, {
        timestamp: new Date('2024-02-15T12:00:00Z'), // Outside range
      });

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      data.forEach(event => {
        const eventDate = new Date(event.timestamp);
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(eventDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should work for all authenticated user roles', async () => {
      const roles = [Role.ADMIN, Role.MODERATOR, Role.USER];

      for (const role of roles) {
        const { headers } = await authUtils.createTestScenario(role);

        const response = await request(app.getHttpServer())
          .get('/api/face-recognition/events')
          .set(headers)
          .expect(200);

        TestHelpers.expectPaginatedResponse(response);
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle empty results gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .query({ faceRecordId: 'non-existent-record-id' })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 0);

      const { data, pagination } = response.body;
      expect(data).toHaveLength(0);
      expect(pagination.total).toBe(0);
    });

    it('should validate query parameters', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Test invalid page/limit values
      const invalidQueries = [
        { page: -1 },
        { page: 0 },
        { limit: -1 },
        { limit: 0 },
        { limit: 1001 }, // Too large
        { startDate: 'invalid-date' },
        { endDate: 'invalid-date' },
      ];

      for (const query of invalidQueries) {
        const response = await request(app.getHttpServer())
          .get('/api/face-recognition/events')
          .query(query)
          .set(headers)
          .expect(400);

        TestHelpers.expectValidationError(response);
      }
    });

    it('should sort events by timestamp in descending order', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create face events with different timestamps
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      await dbManager.createTestFaceEvent(faceRecord.id, {
        timestamp: new Date('2024-01-01T12:00:00Z'),
      });
      await dbManager.createTestFaceEvent(faceRecord.id, {
        timestamp: new Date('2024-01-02T12:00:00Z'),
      });
      await dbManager.createTestFaceEvent(faceRecord.id, {
        timestamp: new Date('2024-01-03T12:00:00Z'),
      });

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      if (data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          const currentTimestamp = new Date(data[i].timestamp);
          const nextTimestamp = new Date(data[i + 1].timestamp);
          expect(currentTimestamp.getTime()).toBeGreaterThanOrEqual(nextTimestamp.getTime());
        }
      }
    });
  });
  describe('GET /api/face-recognition/stats - Get Face Recognition Statistics', () => {
    it('should get face recognition statistics for authenticated users', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create test data for statistics
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      await dbManager.seedFaceEvents(faceRecord.id, 10);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;

      // Validate statistics structure
      expect(data).toHaveProperty('totalFaceRecords');
      expect(data).toHaveProperty('totalEvents');
      expect(data).toHaveProperty('activeFaceRecords');
      expect(data).toHaveProperty('eventsByType');
      expect(data).toHaveProperty('recentEvents');

      // Validate data types
      expect(typeof data.totalFaceRecords).toBe('number');
      expect(typeof data.totalEvents).toBe('number');
      expect(typeof data.activeFaceRecords).toBe('number');
      expect(typeof data.eventsByType).toBe('object');
      expect(Array.isArray(data.recentEvents)).toBe(true);

      // Validate that statistics reflect created data
      expect(data.totalFaceRecords).toBeGreaterThan(0);
      expect(data.totalEvents).toBeGreaterThan(0);
    });

    it('should work for all authenticated user roles', async () => {
      const roles = [Role.ADMIN, Role.MODERATOR, Role.USER];

      for (const role of roles) {
        const { headers } = await authUtils.createTestScenario(role);

        const response = await request(app.getHttpServer())
          .get('/api/face-recognition/stats')
          .set(headers)
          .expect(200);

        TestHelpers.expectSuccessResponse(response);
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should return zero statistics when no data exists', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Ensure no data exists
      await dbManager.cleanDatabase();

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data.totalFaceRecords).toBe(0);
      expect(data.totalEvents).toBe(0);
      expect(data.activeFaceRecords).toBe(0);
      expect(data.recentEvents).toHaveLength(0);
    });

    it('should include event type breakdown', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create events with different types
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      await dbManager.createTestFaceEvent(faceRecord.id, {
        eventType: 'DETECTED',
      });
      await dbManager.createTestFaceEvent(faceRecord.id, {
        eventType: 'RECOGNIZED',
      });
      await dbManager.createTestFaceEvent(faceRecord.id, {
        eventType: 'UNKNOWN',
      });

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data.eventsByType).toHaveProperty('DETECTED');
      expect(data.eventsByType).toHaveProperty('RECOGNIZED');
      expect(data.eventsByType).toHaveProperty('UNKNOWN');

      // Validate counts
      expect(data.eventsByType.DETECTED).toBeGreaterThan(0);
      expect(data.eventsByType.RECOGNIZED).toBeGreaterThan(0);
      expect(data.eventsByType.UNKNOWN).toBeGreaterThan(0);
    });

    it('should include recent events with proper structure', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create recent events
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      await dbManager.seedFaceEvents(faceRecord.id, 5);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      const { data } = response.body;

      if (data.recentEvents.length > 0) {
        data.recentEvents.forEach(event => {
          expect(event).toHaveProperty('id');
          expect(event).toHaveProperty('eventType');
          expect(event).toHaveProperty('confidence');
          expect(event).toHaveProperty('timestamp');
          TestHelpers.expectValidDateString(event.timestamp);
        });

        // Should be sorted by timestamp (most recent first)
        for (let i = 0; i < data.recentEvents.length - 1; i++) {
          const currentTimestamp = new Date(data.recentEvents[i].timestamp);
          const nextTimestamp = new Date(data.recentEvents[i + 1].timestamp);
          expect(currentTimestamp.getTime()).toBeGreaterThanOrEqual(nextTimestamp.getTime());
        }
      }
    });

    it('should distinguish between active and inactive face records', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create active and inactive face records
      const testUser = await dbManager.createTestUser();
      await dbManager.createTestFaceRecord(testUser.id, { isActive: true });
      await dbManager.createTestFaceRecord(testUser.id, { isActive: false });

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data.totalFaceRecords).toBe(2);
      expect(data.activeFaceRecords).toBe(1);
    });

    it('should have reasonable response time for statistics', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create substantial test data
      const testUser = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(testUser.id, 50);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(response, 5000); // 5 seconds max for statistics
    });

    it('should not expose sensitive data in statistics', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should include security headers in statistics response', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should handle concurrent statistics requests', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Make multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer()).get('/api/face-recognition/stats').set(headers)
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestHelpers.expectSuccessResponse(response);
      });

      // All should return consistent data
      const firstStats = responses[0].body.data;
      responses.slice(1).forEach(response => {
        expect(response.body.data.totalFaceRecords).toBe(firstStats.totalFaceRecords);
        expect(response.body.data.totalEvents).toBe(firstStats.totalEvents);
      });
    });

    it('should validate statistics accuracy with known data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create known quantities of data
      const testUser = await dbManager.createTestUser();

      // Create 3 active face records
      const faceRecord1 = await dbManager.createTestFaceRecord(testUser.id, { isActive: true });
      const faceRecord2 = await dbManager.createTestFaceRecord(testUser.id, { isActive: true });

      // Create 5 events for first record, 3 for second
      await dbManager.seedFaceEvents(faceRecord1.id, 5);
      await dbManager.seedFaceEvents(faceRecord2.id, 3);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      const { data } = response.body;
      expect(data.totalFaceRecords).toBe(3);
      expect(data.activeFaceRecords).toBe(2);
      expect(data.totalEvents).toBe(8); // 5 + 3
    });
  });

  describe('Face Events and Statistics Security and Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create substantial test data
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      await dbManager.seedFaceEvents(faceRecord.id, 100);

      // Test events endpoint with large dataset
      const eventsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .query({ limit: 20 })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(eventsResponse, 20);
      TestHelpers.expectResponseTime(eventsResponse, 5000);

      // Test statistics endpoint with large dataset
      const statsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      TestHelpers.expectSuccessResponse(statsResponse);
      TestHelpers.expectResponseTime(statsResponse, 5000);
    });

    it('should validate events and statistics workflow', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      // Step 1: Get initial statistics (should be empty)
      let statsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      const initialStats = statsResponse.body.data;
      const initialFaceRecords = initialStats.totalFaceRecords;

      // Step 2: Enroll a face (this might create events)
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: testUser.id,
      });

      await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      // Step 3: Get updated statistics
      statsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/stats')
        .set(headers)
        .expect(200);

      const updatedStats = statsResponse.body.data;
      expect(updatedStats.totalFaceRecords).toBe(initialFaceRecords + 1);

      // Step 4: Get events (should include any events created during enrollment)
      const eventsResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/events')
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(eventsResponse);
    });
  });
});
