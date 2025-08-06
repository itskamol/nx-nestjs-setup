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

describe('Users Authorization and Security E2E Tests', () => {
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
  scribe('Role-Based Access Control for User Endpoints', () => {
    const userEndpoints = [
      { method: 'post', path: '/api/users', adminOnly: true },
      { method: 'get', path: '/api/users', adminModerator: true },
      { method: 'get', path: '/api/users/me', authenticated: true },
      { method: 'patch', path: '/api/users/me', authenticated: true },
      { method: 'patch', path: '/api/users/me/password', authenticated: true },
    ];

    it('should allow admin access to all user endpoints', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      // Test admin-only endpoints
      await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(DataFactory.createUserData())
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/users/${testUser.id}`)
        .set(headers)
        .send({ firstName: 'Updated' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/users/${testUser.id}`)
        .set(headers)
        .expect(204);

      // Test admin/moderator endpoints
      await request(app.getHttpServer()).get('/api/users').set(headers).expect(200);

      const anotherUser = await dbManager.createTestUser();
      await request(app.getHttpServer())
        .get(`/api/users/${anotherUser.id}`)
        .set(headers)
        .expect(200);

      // Test authenticated endpoints
      await request(app.getHttpServer()).get('/api/users/me').set(headers).expect(200);

      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ firstName: 'AdminUpdated' })
        .expect(200);
    });

    it('should allow moderator access to appropriate endpoints', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const testUser = await dbManager.createTestUser();

      // Test admin/moderator endpoints (should succeed)
      await request(app.getHttpServer()).get('/api/users').set(headers).expect(200);

      await request(app.getHttpServer()).get(`/api/users/${testUser.id}`).set(headers).expect(200);

      // Test authenticated endpoints (should succeed)
      await request(app.getHttpServer()).get('/api/users/me').set(headers).expect(200);

      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ firstName: 'ModeratorUpdated' })
        .expect(200);

      // Test admin-only endpoints (should fail)
      await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(DataFactory.createUserData())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/users/${testUser.id}`)
        .set(headers)
        .send({ firstName: 'Updated' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/users/${testUser.id}`)
        .set(headers)
        .expect(403);
    });

    it('should restrict regular user access to appropriate endpoints', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const testUser = await dbManager.createTestUser();

      // Test authenticated endpoints (should succeed)
      await request(app.getHttpServer()).get('/api/users/me').set(headers).expect(200);

      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ firstName: 'UserUpdated' })
        .expect(200);

      await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set(headers)
        .send({ newPassword: 'NewPassword123!' })
        .expect(204);

      // Test admin-only endpoints (should fail)
      await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(DataFactory.createUserData())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/users/${testUser.id}`)
        .set(headers)
        .send({ firstName: 'Updated' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/users/${testUser.id}`)
        .set(headers)
        .expect(403);

      // Test admin/moderator endpoints (should fail)
      await request(app.getHttpServer()).get('/api/users').set(headers).expect(403);

      await request(app.getHttpServer()).get(`/api/users/${testUser.id}`).set(headers).expect(403);
    });

    it('should deny access to all protected endpoints without authentication', async () => {
      const testUser = await dbManager.createTestUser();

      // Test all protected endpoints without authentication
      await request(app.getHttpServer())
        .post('/api/users')
        .send(DataFactory.createUserData())
        .expect(401);

      await request(app.getHttpServer()).get('/api/users').expect(401);

      await request(app.getHttpServer()).get(`/api/users/${testUser.id}`).expect(401);

      await request(app.getHttpServer()).get('/api/users/me').expect(401);

      await request(app.getHttpServer())
        .patch('/api/users/me')
        .send({ firstName: 'Updated' })
        .expect(401);

      await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .send({ newPassword: 'NewPassword123!' })
        .expect(401);

      await request(app.getHttpServer())
        .patch(`/api/users/${testUser.id}`)
        .send({ firstName: 'Updated' })
        .expect(401);

      await request(app.getHttpServer()).delete(`/api/users/${testUser.id}`).expect(401);
    });
  });
  d;
  escribe('Unauthorized Access Attempts and Proper Error Responses', () => {
    it('should return consistent 401 errors for invalid tokens', async () => {
      const testUser = await dbManager.createTestUser();
      const invalidTokens = [
        'Bearer invalid.token',
        'Bearer expired.token.here',
        'Bearer malformed-token',
        'Basic dGVzdDp0ZXN0', // Wrong auth type
        'Bearer', // Missing token
      ];

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', token)
          .expect(401);

        TestHelpers.expectUnauthorizedResponse(response);
      }
    });

    it('should return consistent 403 errors for insufficient permissions', async () => {
      const { headers: userHeaders } = await authUtils.createTestScenario(Role.USER);
      const { headers: moderatorHeaders } = await authUtils.createTestScenario(Role.MODERATOR);
      const testUser = await dbManager.createTestUser();

      // Test user trying to access admin endpoints
      const userForbiddenEndpoints = [
        { method: 'post', path: '/api/users', body: DataFactory.createUserData() },
        { method: 'patch', path: `/api/users/${testUser.id}`, body: { firstName: 'Updated' } },
        { method: 'delete', path: `/api/users/${testUser.id}` },
        { method: 'get', path: '/api/users' },
        { method: 'get', path: `/api/users/${testUser.id}` },
      ];

      for (const endpoint of userForbiddenEndpoints) {
        const request_builder = request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set(userHeaders);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder.expect(403);
        TestHelpers.expectForbiddenResponse(response);
      }

      // Test moderator trying to access admin-only endpoints
      const moderatorForbiddenEndpoints = [
        { method: 'post', path: '/api/users', body: DataFactory.createUserData() },
        { method: 'patch', path: `/api/users/${testUser.id}`, body: { firstName: 'Updated' } },
        { method: 'delete', path: `/api/users/${testUser.id}` },
      ];

      for (const endpoint of moderatorForbiddenEndpoints) {
        const request_builder = request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set(moderatorHeaders);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder.expect(403);
        TestHelpers.expectForbiddenResponse(response);
      }
    });

    it('should handle expired tokens properly', async () => {
      const testUser = await dbManager.createTestUser();
      const expiredToken = authUtils.generateExpiredToken(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle tokens with invalid signatures', async () => {
      const testUser = await dbManager.createTestUser();
      const invalidToken = authUtils.generateTokenWithInvalidSignature(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle tokens for non-existent users', async () => {
      const fakeUser = {
        id: 'non-existent-user-id',
        email: 'fake@example.com',
        role: 'USER',
      };

      const fakeToken = await authUtils.generateTokensForUser(fakeUser as any);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${fakeToken.accessToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle tokens for inactive users', async () => {
      const inactiveUser = await dbManager.createTestUser({ isActive: false });
      const tokens = await authUtils.loginAs(inactiveUser);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });
  });
  desc;
  ribe('Input Validation and Data Integrity', () => {
    it('should validate user creation data thoroughly', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Test invalid email formats
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@domain',
        'user.domain.com',
        'user@domain..com',
        'user name@domain.com', // Space in email
      ];

      for (const email of invalidEmails) {
        const userData = DataFactory.createUserData({ email });

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .set(headers)
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, 'email');
      }

      // Test invalid password formats
      const invalidPasswords = [
        '123', // Too short
        'password', // No numbers or special chars
        'PASSWORD', // No lowercase
        '12345678', // Only numbers
        'a'.repeat(129), // Too long
      ];

      for (const password of invalidPasswords) {
        const userData = DataFactory.createUserData({ password });

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .set(headers)
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, 'password');
      }

      // Test invalid role values
      const invalidRoles = ['INVALID_ROLE', 'admin', 'user', 123, null];

      for (const role of invalidRoles) {
        const userData = DataFactory.createUserData({ role: role as any });

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .set(headers)
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response);
      }
    });

    it('should validate user update data thoroughly', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      // Test field length limits
      const longString = 'a'.repeat(256);

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({
          firstName: longString,
          lastName: longString,
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should sanitize and validate profile update data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Test XSS prevention
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("xss")</script>',
      ];

      for (const xssPayload of xssAttempts) {
        const response = await request(app.getHttpServer())
          .patch('/api/users/me')
          .set(headers)
          .send({ firstName: xssPayload })
          .expect(400);

        TestHelpers.expectValidationError(response);
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Test SQL injection payloads
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE users SET role='ADMIN'; --",
        "' UNION SELECT * FROM users --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const userData = DataFactory.createUserData({
          firstName: payload,
          lastName: payload,
        });

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .set(headers)
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response);
      }
    });

    it('should validate UUID format for user IDs', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const invalidIds = [
        'invalid-id',
        '123',
        'not-a-uuid',
        '12345678-1234-1234-1234-123456789012', // Wrong format
        '', // Empty string
      ];

      for (const invalidId of invalidIds) {
        const response = await request(app.getHttpServer())
          .get(`/api/users/${invalidId}`)
          .set(headers)
          .expect(400);

        TestHelpers.expectValidationError(response);
      }
    });

    it('should handle concurrent operations safely', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      // Test concurrent updates to same user
      const concurrentUpdates = [
        request(app.getHttpServer())
          .patch(`/api/users/${targetUser.id}`)
          .set(headers)
          .send({ firstName: 'Concurrent1' }),
        request(app.getHttpServer())
          .patch(`/api/users/${targetUser.id}`)
          .set(headers)
          .send({ lastName: 'Concurrent2' }),
        request(app.getHttpServer())
          .patch(`/api/users/${targetUser.id}`)
          .set(headers)
          .send({ role: Role.MODERATOR }),
      ];

      const responses = await Promise.all(concurrentUpdates);

      // All should either succeed or handle conflicts gracefully
      responses.forEach(response => {
        expect([200, 409, 400]).toContain(response.status);
      });
    });

    it('should prevent privilege escalation attempts', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);

      // Try to update own role through profile endpoint
      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({
          firstName: 'Updated',
          role: Role.ADMIN, // Should be ignored
          isActive: true, // Should be ignored
        })
        .expect(200);

      const { data } = response.body;
      expect(data.firstName).toBe('Updated');
      expect(data.role).toBe(user.role); // Should remain unchanged
      expect(data.isActive).toBe(user.isActive); // Should remain unchanged
    });
  });
  des;
  cribe('Security Headers and Response Protection', () => {
    it('should include proper security headers in all responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const endpoints = [
        { method: 'get', path: '/api/users' },
        { method: 'post', path: '/api/users', body: DataFactory.createUserData() },
        { method: 'get', path: '/api/users/me' },
        { method: 'patch', path: '/api/users/me', body: { firstName: 'Updated' } },
      ];

      for (const endpoint of endpoints) {
        const request_builder = request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set(headers);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder;
        TestHelpers.expectSecurityHeaders(response);
      }
    });

    it('should not expose sensitive data in any user responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      const endpoints = [
        { method: 'get', path: '/api/users' },
        { method: 'get', path: `/api/users/${testUser.id}` },
        { method: 'get', path: '/api/users/me' },
        { method: 'patch', path: '/api/users/me', body: { firstName: 'Updated' } },
      ];

      for (const endpoint of endpoints) {
        const request_builder = request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .set(headers);

        if (endpoint.body) {
          request_builder.send(endpoint.body);
        }

        const response = await request_builder;
        TestHelpers.expectNoSensitiveData(response);
      }
    });

    it('should handle CORS requests properly', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .options('/api/users')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization');

      // Should handle OPTIONS request appropriately
      expect([200, 204]).toContain(response.status);
    });

    it('should validate Content-Type for POST/PATCH requests', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const userData = DataFactory.createUserData();

      // Test with invalid content type
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(userData))
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should limit request body size', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create a very large payload
      const largePayload = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: 'a'.repeat(10000), // Very long string
        lastName: 'Test',
        extraLargeField: 'x'.repeat(100000), // Even larger field
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(largePayload);

      // Should either reject due to size limit or validation
      expect([400, 413]).toContain(response.status);
    });

    it('should handle malformed JSON gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should have reasonable response times for user operations', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create test data
      await dbManager.seedUsers(20, Role.USER);

      // Test list endpoint performance
      const listResponse = await request(app.getHttpServer())
        .get('/api/users')
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(listResponse, 3000);

      // Test profile endpoint performance
      const profileResponse = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(profileResponse, 2000);
    });

    it('should handle high concurrency gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Make many concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/users')
          .set(headers)
          .send(
            DataFactory.createUserData({
              email: `concurrent${i}@example.com`,
            })
          )
      );

      const responses = await Promise.all(concurrentRequests);

      // Most should succeed
      const successfulResponses = responses.filter(r => r.status === 201);
      expect(successfulResponses.length).toBeGreaterThan(5);
    });

    it('should handle pagination efficiently with large datasets', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create many users
      await dbManager.seedUsers(100, Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ page: 1, limit: 10 })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 10);
      TestHelpers.expectResponseTime(response, 5000);

      const { pagination } = response.body;
      expect(pagination.total).toBeGreaterThan(50);
      expect(pagination.totalPages).toBeGreaterThan(5);
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error formats across all endpoints', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Test validation error format
      const validationResponse = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(validationResponse.body).toHaveProperty('success', false);
      expect(validationResponse.body).toHaveProperty('error');
      expect(validationResponse.body.error).toHaveProperty('code', 'VALIDATION_ERROR');

      // Test authorization error format
      const authResponse = await request(app.getHttpServer())
        .get('/api/users')
        .set(headers)
        .expect(403);

      expect(authResponse.body).toHaveProperty('success', false);
      expect(authResponse.body).toHaveProperty('error');
      expect(authResponse.body.error).toHaveProperty('code', 'AUTHORIZATION_ERROR');

      // Test not found error format
      const notFoundResponse = await request(app.getHttpServer())
        .get('/api/users/non-existent-id')
        .set(headers)
        .expect(400); // Will be validation error for invalid UUID

      expect(notFoundResponse.body).toHaveProperty('success', false);
      expect(notFoundResponse.body).toHaveProperty('error');
    });

    it('should not expose internal error details', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Try to create user with database constraint violation
      const userData = DataFactory.createUserData();

      // Create user first
      await request(app.getHttpServer()).post('/api/users').set(headers).send(userData).expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(userData)
        .expect(409);

      // Should not expose database error details
      expect(response.body.error.message).not.toContain('duplicate key');
      expect(response.body.error.message).not.toContain('constraint');
      expect(response.body.error.message).not.toContain('SQL');
    });
  });
});
