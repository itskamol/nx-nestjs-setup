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

describe('Users Profile Management E2E Tests', () => {
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
  des;
  cribe('GET /api/users/me - Get Current User Profile', () => {
    it('should get current user profile for authenticated user', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(headers)
        .expect(200);

      TestHelpers.expectUserResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(user.id);
      expect(data.email).toBe(user.email);
      expect(data.firstName).toBe(user.firstName);
      expect(data.lastName).toBe(user.lastName);
      expect(data.role).toBe(user.role);
      expect(data.isActive).toBe(user.isActive);
      expect(data.password).toBeUndefined();
    });

    it('should work for different user roles', async () => {
      // Test admin profile
      const { user: adminUser, headers: adminHeaders } = await authUtils.createTestScenario(
        Role.ADMIN
      );

      let response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data.role).toBe('ADMIN');
      expect(response.body.data.id).toBe(adminUser.id);

      // Test moderator profile
      const { user: moderatorUser, headers: moderatorHeaders } = await authUtils.createTestScenario(
        Role.MODERATOR
      );

      response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(moderatorHeaders)
        .expect(200);

      expect(response.body.data.role).toBe('MODERATOR');
      expect(response.body.data.id).toBe(moderatorUser.id);

      // Test regular user profile
      const { user: regularUser, headers: regularHeaders } = await authUtils.createTestScenario(
        Role.USER
      );

      response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(regularHeaders)
        .expect(200);

      expect(response.body.data.role).toBe('USER');
      expect(response.body.data.id).toBe(regularUser.id);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/users/me').expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with expired token', async () => {
      const testUser = await dbManager.createTestUser();
      const expiredToken = authUtils.generateExpiredToken(testUser);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should include all profile fields except sensitive data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(headers)
        .expect(200);

      const { data } = response.body;

      // Should include these fields
      const expectedFields = [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ];
      TestHelpers.expectObjectHasProperties(data, expectedFields);

      // Should not include sensitive fields
      TestHelpers.expectObjectMissingProperties(data, ['password']);

      // Validate date fields
      TestHelpers.expectValidDateString(data.createdAt);
      TestHelpers.expectValidDateString(data.updatedAt);
    });
  });
  desc;
  ribe('PATCH /api/users/me - Update Current User Profile', () => {
    it('should update current user profile', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);
      const updateData = DataFactory.createUpdateUserData({
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send(updateData)
        .expect(200);

      TestHelpers.expectUserResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(user.id);
      expect(data.firstName).toBe(updateData.firstName);
      expect(data.lastName).toBe(updateData.lastName);
      expect(data.email).toBe(user.email); // Should remain unchanged
      expect(data.role).toBe(user.role); // Should remain unchanged

      // Verify changes in database
      const updatedUser = await dbManager.findUserByEmail(user.email);
      expect(updatedUser.firstName).toBe(updateData.firstName);
      expect(updatedUser.lastName).toBe(updateData.lastName);
    });

    it('should update email address', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);
      const newEmail = 'newemail@example.com';

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ email: newEmail })
        .expect(200);

      const { data } = response.body;
      expect(data.email).toBe(newEmail);

      // Verify email change in database
      const updatedUser = await dbManager.findUserByEmail(newEmail);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.id).toBe(user.id);
    });

    it('should update partial profile data', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);

      // Update only first name
      let response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ firstName: 'OnlyFirst' })
        .expect(200);

      expect(response.body.data.firstName).toBe('OnlyFirst');
      expect(response.body.data.lastName).toBe(user.lastName); // Should remain unchanged

      // Update only last name
      response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ lastName: 'OnlyLast' })
        .expect(200);

      expect(response.body.data.firstName).toBe('OnlyFirst'); // Should remain from previous update
      expect(response.body.data.lastName).toBe('OnlyLast');
    });

    it('should not allow updating role through profile endpoint', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({
          firstName: 'Updated',
          role: 'ADMIN', // Should be ignored
        })
        .expect(200);

      const { data } = response.body;
      expect(data.firstName).toBe('Updated');
      expect(data.role).toBe(user.role); // Should remain unchanged
    });

    it('should not allow updating isActive through profile endpoint', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({
          firstName: 'Updated',
          isActive: false, // Should be ignored
        })
        .expect(200);

      const { data } = response.body;
      expect(data.firstName).toBe('Updated');
      expect(data.isActive).toBe(user.isActive); // Should remain unchanged
    });

    it('should fail without authentication', async () => {
      const updateData = DataFactory.createUpdateUserData();

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .send(updateData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with invalid email format', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ email: 'invalid-email' })
        .expect(400);

      TestHelpers.expectValidationError(response, 'email');
    });

    it('should fail with empty string values', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({
          firstName: '',
          lastName: '',
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail when email already exists', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const existingUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ email: existingUser.email })
        .expect(409);

      TestHelpers.expectConflictResponse(response);
    });

    it('should trim whitespace from input values', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({
          firstName: '  Trimmed  ',
          lastName: '  Name  ',
        })
        .expect(200);

      const { data } = response.body;
      expect(data.firstName).toBe('Trimmed');
      expect(data.lastName).toBe('Name');
    });

    it('should work for different user roles', async () => {
      // Test admin profile update
      const { headers: adminHeaders } = await authUtils.createTestScenario(Role.ADMIN);

      let response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(adminHeaders)
        .send({ firstName: 'AdminUpdated' })
        .expect(200);

      expect(response.body.data.firstName).toBe('AdminUpdated');
      expect(response.body.data.role).toBe('ADMIN');

      // Test moderator profile update
      const { headers: moderatorHeaders } = await authUtils.createTestScenario(Role.MODERATOR);

      response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(moderatorHeaders)
        .send({ firstName: 'ModeratorUpdated' })
        .expect(200);

      expect(response.body.data.firstName).toBe('ModeratorUpdated');
      expect(response.body.data.role).toBe('MODERATOR');
    });
  });
  describ;
  e('PATCH /api/users/me/password - Update Current User Password', () => {
    it('should update current user password', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);
      const newPassword = 'NewStrongPassword123!';

      const response = await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set(headers)
        .send({ newPassword })
        .expect(204);

      expect(response.body).toEqual({});

      // Verify old password no longer works
      const oldLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: user.password, // Old password
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(oldLoginResponse);

      // Verify new password works
      const newLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: newPassword,
        })
        .expect(200);

      TestHelpers.expectAuthResponse(newLoginResponse);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .send({ newPassword: 'NewPassword123!' })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with weak password', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const weakPasswords = ['123', 'password', 'PASSWORD', 'Pass1'];

      for (const weakPassword of weakPasswords) {
        const response = await request(app.getHttpServer())
          .patch('/api/users/me/password')
          .set(headers)
          .send({ newPassword: weakPassword })
          .expect(400);

        TestHelpers.expectValidationError(response, 'newPassword');
      }
    });

    it('should fail with missing password', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set(headers)
        .send({})
        .expect(400);

      TestHelpers.expectValidationError(response, 'newPassword');
    });

    it('should fail with empty password', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set(headers)
        .send({ newPassword: '' })
        .expect(400);

      TestHelpers.expectValidationError(response, 'newPassword');
    });

    it('should work for different user roles', async () => {
      // Test admin password update
      const { user: adminUser, headers: adminHeaders } = await authUtils.createTestScenario(
        Role.ADMIN
      );
      const adminNewPassword = 'AdminNewPassword123!';

      await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set(adminHeaders)
        .send({ newPassword: adminNewPassword })
        .expect(204);

      // Verify admin can login with new password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: adminNewPassword,
        })
        .expect(200);

      // Test moderator password update
      const { user: moderatorUser, headers: moderatorHeaders } = await authUtils.createTestScenario(
        Role.MODERATOR
      );
      const moderatorNewPassword = 'ModeratorNewPassword123!';

      await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set(moderatorHeaders)
        .send({ newPassword: moderatorNewPassword })
        .expect(204);

      // Verify moderator can login with new password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: moderatorUser.email,
          password: moderatorNewPassword,
        })
        .expect(200);
    });

    it('should validate password complexity requirements', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const complexPassword = 'ComplexPassword123!@#';

      const response = await request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set(headers)
        .send({ newPassword: complexPassword })
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should handle concurrent password update requests', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);
      const newPassword1 = 'NewPassword1_123!';
      const newPassword2 = 'NewPassword2_123!';

      // Make concurrent password update requests
      const requests = [
        request(app.getHttpServer())
          .patch('/api/users/me/password')
          .set(headers)
          .send({ newPassword: newPassword1 }),
        request(app.getHttpServer())
          .patch('/api/users/me/password')
          .set(headers)
          .send({ newPassword: newPassword2 }),
      ];

      const responses = await Promise.all(requests);

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 204);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Profile Security and Performance', () => {
    it('should not expose sensitive data in profile responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(headers)
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should have reasonable response times for profile operations', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      // Test profile retrieval
      let response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(response, 2000);

      // Test profile update
      response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send({ firstName: 'Updated' })
        .expect(200);

      TestHelpers.expectResponseTime(response, 3000);
    });

    it('should include security headers in profile responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(headers)
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should handle profile updates with transaction safety', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.USER);
      const updateData = {
        firstName: 'TransactionTest',
        lastName: 'SafetyTest',
        email: 'transaction@example.com',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set(headers)
        .send(updateData)
        .expect(200);

      // Verify all fields were updated atomically
      const { data } = response.body;
      expect(data.firstName).toBe(updateData.firstName);
      expect(data.lastName).toBe(updateData.lastName);
      expect(data.email).toBe(updateData.email);

      // Verify in database
      const updatedUser = await dbManager.findUserByEmail(updateData.email);
      expect(updatedUser.firstName).toBe(updateData.firstName);
      expect(updatedUser.lastName).toBe(updateData.lastName);
    });
  });
});
