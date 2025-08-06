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
import { Role } from '@prisma/client';

describe('Face Recognition Core E2E Tests', () => {
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
  scribe('POST /api/face-recognition/enroll - Face Enrollment', () => {
    it('should enroll a new face as admin', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.ADMIN);
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      TestHelpers.expectFaceRecordResponse(response, 201);

      const { data } = response.body;
      expect(data.userId).toBe(user.id);
      expect(data.faceId).toBe(faceRecordData.faceId);
      expect(data.imageData).toBe(faceRecordData.imageData);
      expect(data.confidence).toBe(faceRecordData.confidence);
      expect(data.isActive).toBe(true);

      // Verify face record was created in database
      const createdRecord = await dbManager.findFaceRecordByFaceId(faceRecordData.faceId);
      expect(createdRecord).toBeDefined();
      expect(createdRecord.userId).toBe(user.id);
    });

    it('should enroll a new face as moderator', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      TestHelpers.expectFaceRecordResponse(response, 201);
    });

    it('should fail to enroll face as regular user', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to enroll face without authentication', async () => {
      const faceRecordData = DataFactory.createFaceRecordData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .send(faceRecordData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should enroll face with additional options', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.ADMIN);
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: user.id,
        options: {
          name: 'John Doe',
          gender: 'male',
          age: 30,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      TestHelpers.expectFaceRecordResponse(response, 201);
    });

    it('should fail with invalid face data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send({
          faceId: '', // Empty faceId
          imageData: 'invalid-image-data',
          faceData: 'invalid-face-data',
          confidence: 1.5, // Invalid confidence > 1
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail when enrolling duplicate faceId', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.ADMIN);
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: user.id,
      });

      // First enrollment should succeed
      await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      // Second enrollment with same faceId should fail
      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(409);

      TestHelpers.expectConflictResponse(response);
    });

    it('should validate required fields for enrollment', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const requiredFields = ['faceId', 'imageData', 'faceData', 'confidence'];

      for (const field of requiredFields) {
        const faceRecordData = DataFactory.createFaceRecordData();
        delete faceRecordData[field];

        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/enroll')
          .set(headers)
          .send(faceRecordData)
          .expect(400);

        TestHelpers.expectValidationError(response, field);
      }
    });

    it('should validate confidence range (0-1)', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const invalidConfidences = [-0.1, 1.1, 2.0, -1.0];

      for (const confidence of invalidConfidences) {
        const faceRecordData = DataFactory.createFaceRecordData({ confidence });

        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/enroll')
          .set(headers)
          .send(faceRecordData)
          .expect(400);

        TestHelpers.expectValidationError(response, 'confidence');
      }
    });
  });
  describe('POST /api/face-recognition/recognize - Face Recognition with File Upload', () => {
    it('should recognize faces from uploaded image', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create some enrolled faces first
      const testUser = await dbManager.createTestUser();
      await dbManager.createTestFaceRecord(testUser.id);

      const mockImageFile = DataFactory.createMockImageFile();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize')
        .set(headers)
        .attach('image', mockImageFile.buffer, mockImageFile.originalname)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('recognizedFaces');
      expect(data).toHaveProperty('unknownFaces');
      expect(Array.isArray(data.recognizedFaces)).toBe(true);
      expect(Array.isArray(data.unknownFaces)).toBe(true);
    });

    it('should work for all authenticated user roles', async () => {
      const roles = [Role.ADMIN, Role.MODERATOR, Role.USER];
      const mockImageFile = DataFactory.createMockImageFile();

      for (const role of roles) {
        const { headers } = await authUtils.createTestScenario(role);

        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/recognize')
          .set(headers)
          .attach('image', mockImageFile.buffer, mockImageFile.originalname)
          .expect(200);

        TestHelpers.expectSuccessResponse(response);
      }
    });

    it('should fail without authentication', async () => {
      const mockImageFile = DataFactory.createMockImageFile();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize')
        .attach('image', mockImageFile.buffer, mockImageFile.originalname)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail without image file', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize')
        .set(headers)
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail with invalid file type', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const invalidFile = DataFactory.createMockInvalidFile();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize')
        .set(headers)
        .attach('image', invalidFile.buffer, invalidFile.originalname)
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail with oversized file', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const oversizedFile = DataFactory.createOversizedMockFile();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize')
        .set(headers)
        .attach('image', oversizedFile.buffer, oversizedFile.originalname)
        .expect(413);

      // Should reject due to file size limit
      expect(response.status).toBe(413);
    });

    it('should handle multiple concurrent recognition requests', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const mockImageFile = DataFactory.createMockImageFile();

      // Make multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post('/api/face-recognition/recognize')
          .set(headers)
          .attach('image', mockImageFile.buffer, mockImageFile.originalname)
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestHelpers.expectSuccessResponse(response);
      });
    });

    it('should validate response structure for recognition results', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const mockImageFile = DataFactory.createMockImageFile();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize')
        .set(headers)
        .attach('image', mockImageFile.buffer, mockImageFile.originalname)
        .expect(200);

      const { data } = response.body;

      // Validate recognizedFaces structure
      if (data.recognizedFaces.length > 0) {
        data.recognizedFaces.forEach(face => {
          expect(face).toHaveProperty('id');
          expect(face).toHaveProperty('faceId');
          expect(face).toHaveProperty('confidence');
        });
      }

      // Validate unknownFaces structure
      if (data.unknownFaces.length > 0) {
        data.unknownFaces.forEach(face => {
          expect(face).toHaveProperty('confidence');
          expect(face).toHaveProperty('boundingBox');
          expect(face.boundingBox).toHaveProperty('x');
          expect(face.boundingBox).toHaveProperty('y');
          expect(face.boundingBox).toHaveProperty('width');
          expect(face.boundingBox).toHaveProperty('height');
        });
      }
    });
  });
  d;
  escribe('POST /api/face-recognition/recognize-base64 - Face Recognition with Base64 Data', () => {
    it('should recognize faces from base64 image data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create some enrolled faces first
      const testUser = await dbManager.createTestUser();
      await dbManager.createTestFaceRecord(testUser.id);

      const base64ImageData = DataFactory.createBase64ImageData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: base64ImageData })
        .expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('recognizedFaces');
      expect(data).toHaveProperty('unknownFaces');
      expect(Array.isArray(data.recognizedFaces)).toBe(true);
      expect(Array.isArray(data.unknownFaces)).toBe(true);
    });

    it('should work for all authenticated user roles', async () => {
      const roles = [Role.ADMIN, Role.MODERATOR, Role.USER];
      const base64ImageData = DataFactory.createBase64ImageData();

      for (const role of roles) {
        const { headers } = await authUtils.createTestScenario(role);

        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/recognize-base64')
          .set(headers)
          .send({ imageData: base64ImageData })
          .expect(200);

        TestHelpers.expectSuccessResponse(response);
      }
    });

    it('should fail without authentication', async () => {
      const base64ImageData = DataFactory.createBase64ImageData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .send({ imageData: base64ImageData })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail without image data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({})
        .expect(400);

      TestHelpers.expectValidationError(response, 'imageData');
    });

    it('should fail with empty image data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: '' })
        .expect(400);

      TestHelpers.expectValidationError(response, 'imageData');
    });

    it('should fail with invalid base64 data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const invalidBase64Data = [
        'invalid-base64-data',
        'data:image/jpeg;base64,invalid-data',
        'not-base64-at-all',
        'data:text/plain;base64,dGVzdA==', // Wrong MIME type
      ];

      for (const invalidData of invalidBase64Data) {
        const response = await request(app.getHttpServer())
          .post('/api/face-recognition/recognize-base64')
          .set(headers)
          .send({ imageData: invalidData })
          .expect(400);

        TestHelpers.expectValidationError(response);
      }
    });

    it('should handle large base64 image data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Create a larger base64 image (but still within reasonable limits)
      const largeImageBuffer = Buffer.alloc(50000, 'a'); // 50KB
      const largeBase64Data = `data:image/jpeg;base64,${largeImageBuffer.toString('base64')}`;

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: largeBase64Data })
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
    });

    it('should validate response structure matches file upload endpoint', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const base64ImageData = DataFactory.createBase64ImageData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: base64ImageData })
        .expect(200);

      const { data } = response.body;

      // Should have same structure as file upload endpoint
      expect(data).toHaveProperty('recognizedFaces');
      expect(data).toHaveProperty('unknownFaces');
      expect(Array.isArray(data.recognizedFaces)).toBe(true);
      expect(Array.isArray(data.unknownFaces)).toBe(true);

      // Validate structure consistency
      if (data.recognizedFaces.length > 0) {
        data.recognizedFaces.forEach(face => {
          expect(face).toHaveProperty('id');
          expect(face).toHaveProperty('faceId');
          expect(face).toHaveProperty('confidence');
        });
      }

      if (data.unknownFaces.length > 0) {
        data.unknownFaces.forEach(face => {
          expect(face).toHaveProperty('confidence');
          expect(face).toHaveProperty('boundingBox');
        });
      }
    });

    it('should handle concurrent base64 recognition requests', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const base64ImageData = DataFactory.createBase64ImageData();

      // Make multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post('/api/face-recognition/recognize-base64')
          .set(headers)
          .send({ imageData: base64ImageData })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestHelpers.expectSuccessResponse(response);
      });
    });

    it('should have reasonable response time for recognition', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const base64ImageData = DataFactory.createBase64ImageData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: base64ImageData })
        .expect(200);

      TestHelpers.expectResponseTime(response, 10000); // 10 seconds max for face recognition
    });
  });

  describe('Face Recognition Security and Performance', () => {
    it('should not expose sensitive data in recognition responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const base64ImageData = DataFactory.createBase64ImageData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: base64ImageData })
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should include security headers in face recognition responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const base64ImageData = DataFactory.createBase64ImageData();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: base64ImageData })
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should handle recognition with no enrolled faces gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const base64ImageData = DataFactory.createBase64ImageData();

      // Ensure no faces are enrolled
      await dbManager.cleanDatabase();

      const response = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: base64ImageData })
        .expect(200);

      const { data } = response.body;
      expect(data.recognizedFaces).toHaveLength(0);
      // May or may not have unknown faces depending on image content
    });

    it('should validate enrollment and recognition workflow', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      // Step 1: Enroll a face
      const faceRecordData = DataFactory.createFaceRecordData({
        userId: testUser.id,
      });

      const enrollResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/enroll')
        .set(headers)
        .send(faceRecordData)
        .expect(201);

      TestHelpers.expectFaceRecordResponse(enrollResponse, 201);

      // Step 2: Try to recognize the same face
      const recognizeResponse = await request(app.getHttpServer())
        .post('/api/face-recognition/recognize-base64')
        .set(headers)
        .send({ imageData: faceRecordData.imageData })
        .expect(200);

      TestHelpers.expectSuccessResponse(recognizeResponse);

      // The recognition might or might not find the face depending on the mock data,
      // but the endpoint should work without errors
      const { data } = recognizeResponse.body;
      expect(data).toHaveProperty('recognizedFaces');
      expect(data).toHaveProperty('unknownFaces');
    });
  });
});
