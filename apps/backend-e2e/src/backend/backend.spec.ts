import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../backend/src/app/app.module';
import { TransformInterceptor } from '../../../backend/src/app/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '../../../backend/src/app/common/filters/global-exception.filter';

describe('Backend E2E Tests - API Health and Basic Functionality', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Application Health and Monitoring', () => {
    it('should provide comprehensive health information', async () => {
      // Step 1: Basic health check
      const healthResponse = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data.status).toMatch(/healthy|degraded|unhealthy/);
      expect(healthResponse.body.data.services).toBeDefined();
      expect(healthResponse.body.data.services.database).toBeDefined();
      expect(healthResponse.body.data.services.cache).toBeDefined();
      expect(healthResponse.body.data.services.memory).toBeDefined();

      // Step 2: Detailed health check
      const detailedHealthResponse = await request(app.getHttpServer())
        .get('/api/health/detailed')
        .expect(200);

      expect(detailedHealthResponse.body.data.system).toBeDefined();
      expect(detailedHealthResponse.body.data.system.nodeVersion).toBeDefined();
      expect(detailedHealthResponse.body.data.system.platform).toBeDefined();

      // Step 3: Application info
      const appInfoResponse = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      expect(appInfoResponse.body.success).toBe(true);
      expect(appInfoResponse.body.data.name).toBeDefined();
      expect(appInfoResponse.body.data.version).toBeDefined();
      expect(appInfoResponse.body.data.environment).toBeDefined();

      // Step 4: Auth service health
      const authHealthResponse = await request(app.getHttpServer())
        .get('/api/auth/health')
        .expect(200);

      expect(authHealthResponse.body.success).toBe(true);
      expect(authHealthResponse.body.data.status).toBe('ok');
    });
  });

  describe('Input Validation', () => {
    it('should validate user registration input', async () => {
      // Step 1: Invalid email validation
      const invalidEmailResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(invalidEmailResponse.body.success).toBe(false);
      expect(invalidEmailResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Step 2: Weak password validation
      const weakPasswordResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(weakPasswordResponse.body.success).toBe(false);
      expect(weakPasswordResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Step 3: Missing required fields
      const missingFieldsResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        })
        .expect(400);

      expect(missingFieldsResponse.body.success).toBe(false);
      expect(missingFieldsResponse.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate login input', async () => {
      // Step 1: Invalid email format
      const invalidEmailResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
        })
        .expect(400);

      expect(invalidEmailResponse.body.success).toBe(false);
      expect(invalidEmailResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Step 2: Missing required fields
      const missingFieldsResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        })
        .expect(400);

      expect(missingFieldsResponse.body.success).toBe(false);
      expect(missingFieldsResponse.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authentication Security', () => {
    it('should handle unauthorized access', async () => {
      // Step 1: Access protected route without token
      const unauthorizedResponse = await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);

      expect(unauthorizedResponse.body.success).toBe(false);
      expect(unauthorizedResponse.body.error.code).toBe('AUTHENTICATION_ERROR');

      // Step 2: Access protected route with invalid token
      const invalidTokenResponse = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(invalidTokenResponse.body.success).toBe(false);
      expect(invalidTokenResponse.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle not found routes', async () => {
      const notFoundResponse = await request(app.getHttpServer())
        .get('/api/nonexistent-endpoint')
        .expect(404);
    });
  });

  });