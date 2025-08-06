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

describe('Face Record Management E2E Tests', () => {
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
  de;
  scribe('GET /api/face-recognition/records - Get Face Records with Pagination', () => {
    it('should get paginated face records for authenticated users', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create test face records
      const testUser = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(testUser.id, 5);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data, pagination } = response.body;
      expect(Array.isArray(data)).toBe(true);
      expect(pagination.total).toBeGreaterThan(0);

      // Validate face record structure
      if (data.length > 0) {
        data.forEach(record => {
          expect(record).toHaveProperty('id');
          expect(record).toHaveProperty('faceId');
          expect(record).toHaveProperty('imageData');
          expect(record).toHaveProperty('confidence');
          expect(record).toHaveProperty('isActive');
          expect(record).toHaveProperty('createdAt');
          expect(record).toHaveProperty('updatedAt');
        });
      }
    });

    it('should support pagination parameters', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create test face records
      const testUser = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(testUser.id, 10);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .query({ page: 1, limit: 5 })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 5);

      const { pagination } = response.body;
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(5);
      expect(pagination.total).toBeGreaterThan(5);
    });

    it('should support filtering by userId', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create face records for different users
      const user1 = await dbManager.createTestUser();
      const user2 = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(user1.id, 3);
      await dbManager.seedFaceRecords(user2.id, 2);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .query({ userId: user1.id })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      data.forEach(record => {
        expect(record.userId).toBe(user1.id);
      });
    });

    it('should support filtering by faceId', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create face records
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .query({ faceId: faceRecord.faceId })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      expect(data).toHaveLength(1);
      expect(data[0].faceId).toBe(faceRecord.faceId);
    });

    it('should work for all authenticated user roles', async () => {
      const roles = [Role.ADMIN, Role.MODERATOR, Role.USER];

      for (const role of roles) {
        const { headers } = await authUtils.createTestScenario(role);

        const response = await request(app.getHttpServer())
          .get('/api/face-recognition/records')
          .set(headers)
          .expect(200);

        TestHelpers.expectPaginatedResponse(response);
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle empty results gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .query({ userId: 'non-existent-user-id' })
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
      ];

      for (const query of invalidQueries) {
        const response = await request(app.getHttpServer())
          .get('/api/face-recognition/records')
          .query(query)
          .set(headers)
          .expect(400);

        TestHelpers.expectValidationError(response);
      }
    });
  });
  describe('GET /api/face-recognition/records/:id - Get Specific Face Record', () => {
    it('should get specific face record by ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create test face record
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(200);

      TestHelpers.expectFaceRecordResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(faceRecord.id);
      expect(data.faceId).toBe(faceRecord.faceId);
      expect(data.userId).toBe(faceRecord.userId);
      expect(data.confidence).toBe(faceRecord.confidence);
    });

    it('should work for all authenticated user roles', async () => {
      const roles = [Role.ADMIN, Role.MODERATOR, Role.USER];
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      for (const role of roles) {
        const { headers } = await authUtils.createTestScenario(role);

        const response = await request(app.getHttpServer())
          .get(`/api/face-recognition/records/${faceRecord.id}`)
          .set(headers)
          .expect(200);

        TestHelpers.expectFaceRecordResponse(response);
      }
    });

    it('should fail without authentication', async () => {
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${faceRecord.id}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with non-existent record ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const nonExistentId = 'non-existent-id';

      const response = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${nonExistentId}`)
        .set(headers)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should fail with invalid UUID format', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const invalidId = 'invalid-uuid-format';

      const response = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${invalidId}`)
        .set(headers)
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should include all face record fields', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(200);

      const { data } = response.body;

      // Should include these fields
      const expectedFields = [
        'id',
        'userId',
        'faceId',
        'imageData',
        'faceData',
        'confidence',
        'isActive',
        'createdAt',
        'updatedAt',
      ];
      TestHelpers.expectObjectHasProperties(data, expectedFields);

      // Validate date fields
      TestHelpers.expectValidDateString(data.createdAt);
      TestHelpers.expectValidDateString(data.updatedAt);
      TestHelpers.expectValidUUID(data.id);
    });
  });
  d;
  escribe('PUT /api/face-recognition/records/:id - Update Face Record', () => {
    it('should update face record as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const updateData = DataFactory.createUpdateFaceRecordData({
        confidence: 0.98,
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .send(updateData)
        .expect(200);

      TestHelpers.expectFaceRecordResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(faceRecord.id);
      expect(data.confidence).toBe(updateData.confidence);
      expect(data.isActive).toBe(updateData.isActive);
      expect(data.faceId).toBe(faceRecord.faceId); // Should remain unchanged

      // Verify changes in database
      const updatedRecord = await dbManager.findFaceRecordByFaceId(faceRecord.faceId);
      expect(updatedRecord.confidence).toBe(updateData.confidence);
      expect(updatedRecord.isActive).toBe(updateData.isActive);
    });

    it('should update face record as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const updateData = DataFactory.createUpdateFaceRecordData({
        confidence: 0.99,
      });

      const response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .send(updateData)
        .expect(200);

      TestHelpers.expectFaceRecordResponse(response);
    });

    it('should fail to update face record as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const updateData = DataFactory.createUpdateFaceRecordData();

      const response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .send(updateData)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      const updateData = DataFactory.createUpdateFaceRecordData();

      const response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${faceRecord.id}`)
        .send(updateData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with non-existent record ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const nonExistentId = 'non-existent-id';
      const updateData = DataFactory.createUpdateFaceRecordData();

      const response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${nonExistentId}`)
        .set(headers)
        .send(updateData)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should validate update data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      // Test invalid confidence values
      const invalidConfidences = [-0.1, 1.1, 2.0, -1.0];

      for (const confidence of invalidConfidences) {
        const response = await request(app.getHttpServer())
          .put(`/api/face-recognition/records/${faceRecord.id}`)
          .set(headers)
          .send({ confidence })
          .expect(400);

        TestHelpers.expectValidationError(response, 'confidence');
      }
    });

    it('should update partial face record data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      // Update only confidence
      let response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .send({ confidence: 0.97 })
        .expect(200);

      expect(response.body.data.confidence).toBe(0.97);
      expect(response.body.data.isActive).toBe(faceRecord.isActive); // Should remain unchanged

      // Update only isActive
      response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.confidence).toBe(0.97); // Should remain from previous update
      expect(response.body.data.isActive).toBe(false);
    });

    it('should not allow updating immutable fields', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .send({
          faceId: 'new-face-id', // Should be ignored or cause error
          userId: 'new-user-id', // Should be ignored or cause error
          confidence: 0.95,
        })
        .expect(200);

      const { data } = response.body;
      expect(data.faceId).toBe(faceRecord.faceId); // Should remain unchanged
      expect(data.userId).toBe(faceRecord.userId); // Should remain unchanged
      expect(data.confidence).toBe(0.95); // Should be updated
    });
  });
  describe('DELETE /api/face-recognition/records/:id - Delete Face Record', () => {
    it('should delete face record as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify face record was deleted from database
      const deletedRecord = await dbManager.findFaceRecordByFaceId(faceRecord.faceId);
      expect(deletedRecord).toBeNull();
    });

    it('should fail to delete face record as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);

      // Verify face record was not deleted
      const stillExistsRecord = await dbManager.findFaceRecordByFaceId(faceRecord.faceId);
      expect(stillExistsRecord).toBeDefined();
    });

    it('should fail to delete face record as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${faceRecord.id}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with non-existent record ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const nonExistentId = 'non-existent-id';

      const response = await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${nonExistentId}`)
        .set(headers)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should fail with invalid UUID format', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const invalidId = 'invalid-uuid-format';

      const response = await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${invalidId}`)
        .set(headers)
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should handle deletion of face record with related events', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      // Create related face events
      await dbManager.seedFaceEvents(faceRecord.id, 3);

      const response = await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify face record and related data were handled properly
      const deletedRecord = await dbManager.findFaceRecordByFaceId(faceRecord.faceId);
      expect(deletedRecord).toBeNull();
    });

    it('should handle concurrent deletion attempts', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      // Make concurrent deletion requests
      const requests = [
        request(app.getHttpServer())
          .delete(`/api/face-recognition/records/${faceRecord.id}`)
          .set(headers),
        request(app.getHttpServer())
          .delete(`/api/face-recognition/records/${faceRecord.id}`)
          .set(headers),
      ];

      const responses = await Promise.all(requests);

      // One should succeed (204), one should fail (404)
      const statusCodes = responses.map(r => r.status).sort();
      expect(statusCodes).toEqual([204, 404]);
    });
  });

  describe('Face Record Management Security and Performance', () => {
    it('should not expose sensitive data in face record responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const testUser = await dbManager.createTestUser();
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);

      const response = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should have reasonable response times for face record operations', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create test data
      const testUser = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(testUser.id, 20);

      // Test list endpoint performance
      const listResponse = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(listResponse, 5000);

      // Test single record endpoint performance
      const faceRecord = await dbManager.createTestFaceRecord(testUser.id);
      const singleResponse = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${faceRecord.id}`)
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(singleResponse, 2000);
    });

    it('should include security headers in face record responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .set(headers)
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should handle large datasets efficiently with pagination', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create many face records
      const testUser = await dbManager.createTestUser();
      await dbManager.seedFaceRecords(testUser.id, 100);

      const response = await request(app.getHttpServer())
        .get('/api/face-recognition/records')
        .query({ page: 1, limit: 10 })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 10);
      TestHelpers.expectResponseTime(response, 5000);

      const { pagination } = response.body;
      expect(pagination.total).toBeGreaterThan(50);
      expect(pagination.totalPages).toBeGreaterThan(5);
    });

    it('should validate face record management workflow', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      // Step 1: Create face record
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: testUser.id,
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      const createdRecord = createResponse.body.data;

      // Step 2: Get the created record
      const getResponse = await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${createdRecord.id}`)
        .set(headers)
        .expect(200);

      expect(getResponse.body.data.id).toBe(createdRecord.id);

      // Step 3: Update the record
      const updateData = { confidence: 0.99 };
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/face-recognition/records/${createdRecord.id}`)
        .set(headers)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.confidence).toBe(0.99);

      // Step 4: Delete the record
      await request(app.getHttpServer())
        .delete(`/api/face-recognition/records/${createdRecord.id}`)
        .set(headers)
        .expect(204);

      // Step 5: Verify deletion
      await request(app.getHttpServer())
        .get(`/api/face-recognition/records/${createdRecord.id}`)
        .set(headers)
        .expect(404);
    });
  });
});
