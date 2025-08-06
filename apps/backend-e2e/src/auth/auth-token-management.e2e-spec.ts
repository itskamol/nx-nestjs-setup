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

describe('Auth Token Management E2E Tests', () => {
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

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Create user and get initial tokens
      const testUser = await dbManager.createTestUser();
      const initialTokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: initialTokens.refreshToken,
        })
        .expect(200);

      TestHelpers.expectAuthResponse(response, 200);

      // Validate new tokens are different from initial ones
      const { data } = response.body;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.accessToken).not.toBe(initialTokens.accessToken);
      expect(data.refreshToken).not.toBe(initialTokens.refreshToken);

      // Validate user data in response
      expect(data.user.id).toBe(testUser.id);
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.role).toBe(testUser.role);
      expect(data.user.password).toBeUndefined();
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token',
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with expired refresh token', async () => {
      const testUser = await dbManager.createTestUser();
      const expiredToken = authUtils.generateTokensWithExpiration(testUser, '1h', '-1h'); // Expired refresh token

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredToken.refreshToken,
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with malformed refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'malformed-token',
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      TestHelpers.expectValidationError(response, 'refreshToken');
    });

    it('should fail with empty refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: '',
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'refreshToken');
    });

    it('should fail with refresh token signed with different secret', async () => {
      const testUser = await dbManager.createTestUser();
      const invalidToken = authUtils.generateTokenWithInvalidSignature(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: invalidToken,
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should work for different user roles', async () => {
      // Test admin user
      const adminUser = await dbManager.createAdminUser();
      const adminTokens = await authUtils.loginAs(adminUser);

      let response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: adminTokens.refreshToken,
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('ADMIN');

      // Test moderator user
      const moderatorUser = await dbManager.createModeratorUser();
      const moderatorTokens = await authUtils.loginAs(moderatorUser);

      response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: moderatorTokens.refreshToken,
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('MODERATOR');

      // Test regular user
      const regularUser = await dbManager.createRegularUser();
      const regularTokens = await authUtils.loginAs(regularUser);

      response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: regularTokens.refreshToken,
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('USER');
    });

    it('should fail for inactive user', async () => {
      const testUser = await dbManager.createTestUser({ isActive: false });
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should validate new token structure', async () => {
      const testUser = await dbManager.createTestUser();
      const initialTokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: initialTokens.refreshToken,
        })
        .expect(200);

      const { accessToken } = response.body.data;

      // Decode new token to validate structure
      const decodedToken = authUtils.decodeToken(accessToken);
      expect(decodedToken).toHaveProperty('sub', testUser.id);
      expect(decodedToken).toHaveProperty('email', testUser.email);
      expect(decodedToken).toHaveProperty('role', testUser.role);
      expect(decodedToken).toHaveProperty('iat');
      expect(decodedToken).toHaveProperty('exp');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid tokens', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should fail logout without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({
          refreshToken: 'some-refresh-token',
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail logout with invalid access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.access.token')
        .send({
          refreshToken: 'some-refresh-token',
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail logout with expired access token', async () => {
      const testUser = await dbManager.createTestUser();
      const expiredToken = authUtils.generateExpiredToken(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          refreshToken: 'some-refresh-token',
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail logout without refresh token', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({})
        .expect(400);

      TestHelpers.expectValidationError(response, 'refreshToken');
    });

    it('should fail logout with empty refresh token', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          refreshToken: '',
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'refreshToken');
    });

    it('should work for different user roles', async () => {
      // Test admin logout
      const adminUser = await dbManager.createAdminUser();
      const adminTokens = await authUtils.loginAs(adminUser);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send({
          refreshToken: adminTokens.refreshToken,
        })
        .expect(204);

      // Test moderator logout
      const moderatorUser = await dbManager.createModeratorUser();
      const moderatorTokens = await authUtils.loginAs(moderatorUser);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${moderatorTokens.accessToken}`)
        .send({
          refreshToken: moderatorTokens.refreshToken,
        })
        .expect(204);

      // Test regular user logout
      const regularUser = await dbManager.createRegularUser();
      const regularTokens = await authUtils.loginAs(regularUser);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${regularTokens.accessToken}`)
        .send({
          refreshToken: regularTokens.refreshToken,
        })
        .expect(204);
    });

    it('should invalidate refresh token after logout', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Logout successfully
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(204);

      // Try to use the refresh token after logout - should fail
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle logout with malformed refresh token gracefully', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          refreshToken: 'malformed-refresh-token',
        })
        .expect(204); // Should still succeed as access token is valid

      expect(response.body).toEqual({});
    });
  });

  describe('Token Security and Validation', () => {
    it('should not accept tokens with tampered payload', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Tamper with the token by changing a character
      const tamperedToken = tokens.accessToken.slice(0, -5) + 'XXXXX';

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should handle concurrent token refresh requests', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Make multiple concurrent refresh requests
      const refreshPromises = Array.from({ length: 3 }, () =>
        request(app.getHttpServer()).post('/api/auth/refresh').send({
          refreshToken: tokens.refreshToken,
        })
      );

      const responses = await Promise.all(refreshPromises);

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // All successful responses should have valid token structure
      successfulResponses.forEach(response => {
        TestHelpers.expectAuthResponse(response, 200);
      });
    });

    it('should validate token expiration times', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const decodedAccessToken = authUtils.decodeToken(tokens.accessToken);
      const decodedRefreshToken = authUtils.decodeToken(tokens.refreshToken);

      // Access token should expire before refresh token
      expect(decodedAccessToken.exp).toBeLessThan(decodedRefreshToken.exp);

      // Tokens should have reasonable expiration times
      const now = Math.floor(Date.now() / 1000);
      expect(decodedAccessToken.exp).toBeGreaterThan(now);
      expect(decodedRefreshToken.exp).toBeGreaterThan(now);
    });

    it('should not expose sensitive data in token responses', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should validate response time for token operations', async () => {
      const testUser = await dbManager.createTestUser();
      const tokens = await authUtils.loginAs(testUser);

      // Test refresh token response time
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(200);

      TestHelpers.expectResponseTime(refreshResponse, 2000);

      // Test logout response time
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(204);

      TestHelpers.expectResponseTime(logoutResponse, 2000);
    });
  });
});
