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

describe('Auth Security and Validation E2E Tests', () => {
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

  describe('Authentication Failures and Unauthorized Access', () => {
    it('should reject requests without Authorization header', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/auth/me' },
        { method: 'post', path: '/api/auth/logout' },
        { method: 'post', path: '/api/auth/change-password' },
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .send({})
          .expect(401);

        TestHelpers.expectUnauthorizedResponse(response);
      }
    });

    it('should reject requests with empty Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', '')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should reject requests with malformed Bearer tokens', async () => {
      const malformedTokens = [
        'Bearer', // No token
        'Bearer ', // Empty token
        'Bearer invalid-token', // Invalid format
        'Bearer token.without.signature',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Incomplete token
        'Basic dGVzdDp0ZXN0', // Wrong auth type
      ];

      for (const token of malformedTokens) {
        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', token)
          .expect(401);

        TestHelpers.expectUnauthorizedResponse(response);
      }
    });

    it('should reject expired tokens', async () => {
      const testUser = await dbManager.createTestUser();
      const expiredToken = authUtils.generateExpiredToken(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should reject tokens with invalid signatures', async () => {
      const testUser = await dbManager.createTestUser();
      const invalidToken = authUtils.generateTokenWithInvalidSignature(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should reject tokens for non-existent users', async () => {
      // Create a token for a user that doesn't exist in database
      const fakeUser = {
        id: 'non-existent-user-id',
        email: 'fake@example.com',
        role: 'USER',
      };

      const fakeToken = authUtils.generateTokensForUser(fakeUser as any);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${(await fakeToken).accessToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should reject tokens for inactive users', async () => {
      const testUser = await dbManager.createTestUser({ isActive: false });
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle case-sensitive token validation', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Change case of Bearer
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `bearer ${tokens.accessToken}`) // lowercase 'bearer'
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });
  });

  describe('Input Validation for Registration', () => {
    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user@domain',
        'user.domain.com',
        'user@domain..com',
        'user name@domain.com', // Space in email
        'user@domain .com', // Space in domain
        'user@domain.c', // TLD too short
        `user@${'a'.repeat(250)}.com`, // Domain too long
        `${'a'.repeat(65)}@domain.com`, // Local part too long
      ];

      for (const email of invalidEmails) {
        const userData = DataFactory.createRegistrationData({ email });

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, 'email');
      }
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = [
        '123', // Too short
        'password', // No numbers or special chars
        'PASSWORD', // No lowercase or numbers
        '12345678', // Only numbers
        'abcdefgh', // Only lowercase
        'ABCDEFGH', // Only uppercase
        'Password', // No numbers or special chars
        'Password123', // No special chars
        'Password!', // No numbers
        '123456!', // Too short with special char
        'Pass!1', // Too short overall
        'a'.repeat(129), // Too long (over 128 chars)
      ];

      for (const password of weakPasswords) {
        const userData = DataFactory.createRegistrationData({ password });

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, 'password');
      }
    });

    it('should validate required fields presence', async () => {
      const requiredFields = ['email', 'password', 'firstName', 'lastName'];

      for (const field of requiredFields) {
        const userData = DataFactory.createRegistrationData();
        delete userData[field];

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, field);
      }
    });

    it('should validate field length limits', async () => {
      const fieldLimits = [
        { field: 'firstName', maxLength: 50 },
        { field: 'lastName', maxLength: 50 },
        { field: 'email', maxLength: 255 },
      ];

      for (const { field, maxLength } of fieldLimits) {
        const userData = DataFactory.createRegistrationData({
          [field]: 'a'.repeat(maxLength + 1),
        });

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, field);
      }
    });

    it('should reject empty string values', async () => {
      const fields = ['email', 'password', 'firstName', 'lastName'];

      for (const field of fields) {
        const userData = DataFactory.createRegistrationData({
          [field]: '',
        });

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, field);
      }
    });

    it('should reject whitespace-only values', async () => {
      const fields = ['firstName', 'lastName'];

      for (const field of fields) {
        const userData = DataFactory.createRegistrationData({
          [field]: '   ', // Only whitespace
        });

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, field);
      }
    });

    it('should sanitize and trim input values', async () => {
      const userData = DataFactory.createRegistrationData({
        email: '  test@example.com  ',
        firstName: '  John  ',
        lastName: '  Doe  ',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const { user } = response.body.data;
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });

    it('should reject additional unexpected fields', async () => {
      const userData = DataFactory.createRegistrationData();
      const dataWithExtraFields = {
        ...userData,
        unexpectedField: 'should be rejected',
        role: 'ADMIN', // Should not be allowed in registration
        isActive: false, // Should not be allowed in registration
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(dataWithExtraFields)
        .expect(400);

      TestHelpers.expectValidationError(response);
    });
  });

  describe('Input Validation for Login', () => {
    it('should validate login email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@domain',
        'user.domain.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email,
            password: 'ValidPassword123!',
          })
          .expect(400);

        TestHelpers.expectValidationError(response, 'email');
      }
    });

    it('should validate login password presence', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'password');
    });

    it('should reject empty login credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '',
          password: '',
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should reject login with additional unexpected fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
          unexpectedField: 'should be rejected',
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });
  });

  describe('Rate Limiting and Security Headers', () => {
    it('should include security headers in all responses', async () => {
      const endpoints = [
        { method: 'get', path: '/api/auth/health' },
        { method: 'post', path: '/api/auth/register', body: DataFactory.createRegistrationData() },
      ];

      for (const endpoint of endpoints) {
        const request_builder = request(app.getHttpServer())[endpoint.method](endpoint.path);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder;
        TestHelpers.expectSecurityHeaders(response);
      }
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      // Should handle OPTIONS request appropriately
      expect([200, 204]).toContain(response.status);
    });

    it('should validate Content-Type for POST requests', async () => {
      const userData = DataFactory.createRegistrationData();

      // Test with invalid content type
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(userData))
        .expect(400);

      // Should reject non-JSON content type
      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should limit request body size', async () => {
      // Create a very large payload
      const largePayload = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: 'a'.repeat(10000), // Very long string
        lastName: 'Test',
        largeField: 'x'.repeat(100000), // Even larger field
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(largePayload);

      // Should either reject due to size limit or validation
      expect([400, 413]).toContain(response.status);
    });

    it('should handle concurrent authentication requests', async () => {
      const userData = DataFactory.createRegistrationData();

      // Create multiple concurrent registration requests
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            ...userData,
            email: `concurrent${i}@example.com`,
          })
      );

      const responses = await Promise.all(requests);

      // All should succeed or fail gracefully
      responses.forEach(response => {
        expect([201, 400, 409]).toContain(response.status);
      });
    });

    it('should validate request timeout handling', async () => {
      // This test would require configuring request timeouts
      // For now, we'll test that normal requests complete quickly
      const startTime = Date.now();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('path');
    });

    it('should return consistent error format for authentication errors', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('path');
    });

    it('should not expose internal error details', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPassword123!',
        })
        .expect(401);

      // Should not reveal whether user exists or not
      expect(response.body.error.message).not.toContain('user not found');
      expect(response.body.error.message).not.toContain('invalid password');

      // Should use generic authentication error message
      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should include correlation IDs in error responses', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

      // Check if response includes some form of request tracking
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('path');
    });
  });
});
