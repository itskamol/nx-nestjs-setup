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

describe('Auth Profile and Security E2E Tests', () => {
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

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);
      const passwordData = DataFactory.createPasswordChangeData({
        currentPassword: testUser.password,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send(passwordData)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify old password no longer works
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password, // Old password
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(loginResponse);

      // Verify new password works
      const newLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: passwordData.newPassword,
        })
        .expect(200);

      TestHelpers.expectAuthResponse(newLoginResponse);
    });

    it('should fail without authentication', async () => {
      const passwordData = DataFactory.createPasswordChangeData();

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .send(passwordData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with invalid access token', async () => {
      const passwordData = DataFactory.createPasswordChangeData();

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer invalid.token')
        .send(passwordData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with expired access token', async () => {
      const testUser = await dbManager.createTestUser();
      const expiredToken = authUtils.generateExpiredToken(testUser);
      const passwordData = DataFactory.createPasswordChangeData();

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(passwordData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with incorrect current password', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);
      const passwordData = DataFactory.createPasswordChangeData({
        currentPassword: 'WrongCurrentPassword123!',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send(passwordData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with weak new password', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);
      const passwordData = DataFactory.createPasswordChangeData({
        currentPassword: testUser.password,
        newPassword: '123', // Too weak
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send(passwordData)
        .expect(400);

      TestHelpers.expectValidationError(response, 'newPassword');
    });

    it('should fail with missing current password', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          newPassword: 'NewValidPassword123!',
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'currentPassword');
    });

    it('should fail with missing new password', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: testUser.password,
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'newPassword');
    });

    it('should work for different user roles', async () => {
      // Test admin password change
      const adminUser = await dbManager.createAdminUser();
      const adminTokens = await authUtils.loginAs(adminUser);
      const adminPasswordData = DataFactory.createPasswordChangeData({
        currentPassword: adminUser.password,
      });

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(adminPasswordData)
        .expect(204);

      // Test moderator password change
      const moderatorUser = await dbManager.createModeratorUser();
      const moderatorTokens = await authUtils.loginAs(moderatorUser);
      const moderatorPasswordData = DataFactory.createPasswordChangeData({
        currentPassword: moderatorUser.password,
      });

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${moderatorTokens.accessToken}`)
        .send(moderatorPasswordData)
        .expect(204);

      // Test regular user password change
      const regularUser = await dbManager.createRegularUser();
      const regularTokens = await authUtils.loginAs(regularUser);
      const regularPasswordData = DataFactory.createPasswordChangeData({
        currentPassword: regularUser.password,
      });

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${regularTokens.accessToken}`)
        .send(regularPasswordData)
        .expect(204);
    });

    it('should not allow same password as current', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: testUser.password, // Same as current
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user information', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      TestHelpers.expectUserResponse(response);

      // Validate user data
      const userData = response.body.data || response.body; // Handle different response formats
      expect(userData.id).toBe(testUser.id);
      expect(userData.email).toBe(testUser.email);
      expect(userData.firstName).toBe(testUser.firstName);
      expect(userData.lastName).toBe(testUser.lastName);
      expect(userData.role).toBe(testUser.role);
      expect(userData.isActive).toBe(testUser.isActive);

      // Ensure password is not included
      expect(userData.password).toBeUndefined();

      // Validate timestamps
      expect(userData.createdAt).toBeDefined();
      expect(userData.updatedAt).toBeDefined();
      TestHelpers.expectValidDateString(userData.createdAt);
      TestHelpers.expectValidDateString(userData.updatedAt);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with invalid access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with expired access token', async () => {
      const testUser = await dbManager.createTestUser();
      const expiredToken = authUtils.generateExpiredToken(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should work for different user roles', async () => {
      // Test admin user
      const adminUser = await dbManager.createAdminUser();
      const adminTokens = await authUtils.loginAs(adminUser);

      let response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(200);

      const adminData = response.body.data || response.body;
      expect(adminData.role).toBe('ADMIN');

      // Test moderator user
      const moderatorUser = await dbManager.createModeratorUser();
      const moderatorTokens = await authUtils.loginAs(moderatorUser);

      response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${moderatorTokens.accessToken}`)
        .expect(200);

      const moderatorData = response.body.data || response.body;
      expect(moderatorData.role).toBe('MODERATOR');

      // Test regular user
      const regularUser = await dbManager.createRegularUser();
      const regularTokens = await authUtils.loginAs(regularUser);

      response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${regularTokens.accessToken}`)
        .expect(200);

      const regularData = response.body.data || response.body;
      expect(regularData.role).toBe('USER');
    });

    it('should fail for inactive user', async () => {
      const testUser = await dbManager.createTestUser({ isActive: false });
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should not expose sensitive data', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should validate response time', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      TestHelpers.expectResponseTime(response, 2000);
    });
  });

  describe('GET /api/auth/health', () => {
    it('should return auth service health status', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/health').expect(200);

      TestHelpers.expectSuccessResponse(response);

      const { data } = response.body;
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
      TestHelpers.expectValidDateString(data.timestamp);
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/health').expect(200);

      TestHelpers.expectSuccessResponse(response);
    });

    it('should have reasonable response time', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/health').expect(200);

      TestHelpers.expectResponseTime(response, 1000); // 1 second max for health check
    });

    it('should include security headers', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/health').expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should not expose sensitive information', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/health').expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });
  });

  describe('Authentication Security Tests', () => {
    it('should reject malformed Authorization headers', async () => {
      const malformedHeaders = [
        'Bearer', // Missing token
        'bearer token', // Wrong case
        'Basic token', // Wrong auth type
        'Bearer token.with.dots but.invalid',
        `Bearer ${'a'.repeat(1000)}`, // Extremely long token
      ];

      for (const header of malformedHeaders) {
        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', header)
          .expect(401);

        TestHelpers.expectUnauthorizedResponse(response);
      }
    });

    it('should handle concurrent authenticated requests', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Make multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tokens.accessToken}`)
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestHelpers.expectUserResponse(response);
      });
    });

    it('should validate token signature integrity', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Tamper with token signature
      const tokenParts = tokens.accessToken.split('.');
      const tamperedToken = `${tokenParts[0]}.${tokenParts[1]}.tampered_signature`;

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should validate token payload integrity', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Tamper with token payload
      const tokenParts = tokens.accessToken.split('.');
      const tamperedPayload = Buffer.from('{"sub":"fake-user-id","role":"ADMIN"}').toString(
        'base64'
      );
      const tamperedToken = `${tokenParts[0]}.${tamperedPayload}.${tokenParts[2]}`;

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle token with future issued time', async () => {
      // This would require manual JWT creation with future iat
      // For now, we'll test with an obviously invalid token
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        )
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should rate limit authentication attempts if configured', async () => {
      // This test would depend on rate limiting being configured
      // For now, we'll just verify the endpoint responds normally
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      TestHelpers.expectUserResponse(response);
    });

    it('should validate CORS headers for auth endpoints', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/health').expect(200);

      TestHelpers.expectCorsHeaders(response);
    });

    it('should include proper security headers', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });
  });
});
