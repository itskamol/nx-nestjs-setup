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

describe('Users Admin Operations E2E Tests', () => {
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
  describe('PATCH /api/users/:id - Update User (Admin Only)', () => {
    it('should update user as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();
      const updateData = DataFactory.createUpdateUserData({
        firstName: 'AdminUpdated',
        lastName: 'User',
        role: Role.MODERATOR,
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send(updateData)
        .expect(200);

      TestHelpers.expectUserResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(targetUser.id);
      expect(data.firstName).toBe(updateData.firstName);
      expect(data.lastName).toBe(updateData.lastName);
      expect(data.role).toBe(updateData.role);
      expect(data.email).toBe(targetUser.email); // Should remain unchanged

      // Verify changes in database
      const updatedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(updatedUser.firstName).toBe(updateData.firstName);
      expect(updatedUser.role).toBe(updateData.role);
    });

    it('should update user role as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createRegularUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ role: Role.MODERATOR })
        .expect(200);

      expect(response.body.data.role).toBe('MODERATOR');

      // Verify role change in database
      const updatedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(updatedUser.role).toBe('MODERATOR');
    });

    it('should update user active status as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: true });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);

      // Verify status change in database
      const updatedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(updatedUser.isActive).toBe(false);
    });

    it('should update user email as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();
      const newEmail = 'admin-updated@example.com';

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body.data.email).toBe(newEmail);

      // Verify email change in database
      const updatedUser = await dbManager.findUserByEmail(newEmail);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.id).toBe(targetUser.id);
    });

    it('should fail to update user as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const targetUser = await dbManager.createTestUser();
      const updateData = DataFactory.createUpdateUserData();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send(updateData)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to update user as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const targetUser = await dbManager.createTestUser();
      const updateData = DataFactory.createUpdateUserData();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send(updateData)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const targetUser = await dbManager.createTestUser();
      const updateData = DataFactory.createUpdateUserData();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .send(updateData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with non-existent user ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const nonExistentId = 'non-existent-id';
      const updateData = DataFactory.createUpdateUserData();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${nonExistentId}`)
        .set(headers)
        .send(updateData)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should fail with invalid email format', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ email: 'invalid-email' })
        .expect(400);

      TestHelpers.expectValidationError(response, 'email');
    });

    it('should fail when email already exists', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();
      const existingUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ email: existingUser.email })
        .expect(409);

      TestHelpers.expectConflictResponse(response);
    });

    it('should update partial user data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      // Update only first name
      let response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ firstName: 'OnlyFirst' })
        .expect(200);

      expect(response.body.data.firstName).toBe('OnlyFirst');
      expect(response.body.data.lastName).toBe(targetUser.lastName); // Should remain unchanged

      // Update only role
      response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ role: Role.MODERATOR })
        .expect(200);

      expect(response.body.data.firstName).toBe('OnlyFirst'); // Should remain from previous update
      expect(response.body.data.role).toBe('MODERATOR');
    });
  });
  describe('DELETE /api/users/:id - Delete User (Admin Only)', () => {
    it('should delete user as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${targetUser.id}`)
        .set(headers)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify user was deleted from database
      const deletedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(deletedUser).toBeNull();
    });

    it('should fail to delete user as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${targetUser.id}`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);

      // Verify user was not deleted
      const stillExistsUser = await dbManager.findUserByEmail(targetUser.email);
      expect(stillExistsUser).toBeDefined();
    });

    it('should fail to delete user as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${targetUser.id}`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${targetUser.id}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with non-existent user ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const nonExistentId = 'non-existent-id';

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${nonExistentId}`)
        .set(headers)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should handle deletion of user with related data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      // Create related face records for the user
      await dbManager.createTestFaceRecord(targetUser.id);

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${targetUser.id}`)
        .set(headers)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify user and related data were handled properly
      const deletedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(deletedUser).toBeNull();
    });

    it('should not allow admin to delete themselves', async () => {
      const { user, headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${user.id}`)
        .set(headers)
        .expect(400);

      TestHelpers.expectValidationError(response);

      // Verify admin user still exists
      const stillExistsUser = await dbManager.findUserByEmail(user.email);
      expect(stillExistsUser).toBeDefined();
    });
  });
  describe('PATCH /api/users/:id/deactivate - Deactivate User (Admin Only)', () => {
    it('should deactivate user as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: true });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set(headers)
        .expect(200);

      TestHelpers.expectUserResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(targetUser.id);
      expect(data.isActive).toBe(false);

      // Verify deactivation in database
      const deactivatedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(deactivatedUser.isActive).toBe(false);
    });

    it('should handle already deactivated user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: false });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set(headers)
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it('should fail to deactivate user as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to deactivate user as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with non-existent user ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const nonExistentId = 'non-existent-id';

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${nonExistentId}/deactivate`)
        .set(headers)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should prevent deactivated user from logging in', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: true });

      // Deactivate user
      await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set(headers)
        .expect(200);

      // Try to login as deactivated user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: targetUser.email,
          password: targetUser.password,
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(loginResponse);
    });
  });
  describe('PATCH /api/users/:id/activate - Activate User (Admin Only)', () => {
    it('should activate user as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: false });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/activate`)
        .set(headers)
        .expect(200);

      TestHelpers.expectUserResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(targetUser.id);
      expect(data.isActive).toBe(true);

      // Verify activation in database
      const activatedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(activatedUser.isActive).toBe(true);
    });

    it('should handle already activated user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: true });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/activate`)
        .set(headers)
        .expect(200);

      expect(response.body.data.isActive).toBe(true);
    });

    it('should fail to activate user as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/activate`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to activate user as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/activate`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail without authentication', async () => {
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/activate`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with non-existent user ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const nonExistentId = 'non-existent-id';

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${nonExistentId}/activate`)
        .set(headers)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should allow activated user to login', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: false });

      // Activate user
      await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/activate`)
        .set(headers)
        .expect(200);

      // Try to login as activated user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: targetUser.email,
          password: targetUser.password,
        })
        .expect(200);

      TestHelpers.expectAuthResponse(loginResponse);
    });

    it('should handle activation/deactivation cycle', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser({ isActive: true });

      // Deactivate user
      let response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set(headers)
        .expect(200);

      expect(response.body.data.isActive).toBe(false);

      // Activate user again
      response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/activate`)
        .set(headers)
        .expect(200);

      expect(response.body.data.isActive).toBe(true);

      // Verify final state in database
      const finalUser = await dbManager.findUserByEmail(targetUser.email);
      expect(finalUser.isActive).toBe(true);
    });
  });

  describe('Admin Operations Security and Performance', () => {
    it('should not expose sensitive data in admin responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ firstName: 'Updated' })
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should have reasonable response times for admin operations', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      // Test update operation
      let response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ firstName: 'Updated' })
        .expect(200);

      TestHelpers.expectResponseTime(response, 3000);

      // Test deactivation operation
      response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}/deactivate`)
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(response, 2000);
    });

    it('should include security headers in admin responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send({ firstName: 'Updated' })
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should handle concurrent admin operations safely', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      // Make concurrent update requests
      const requests = [
        request(app.getHttpServer())
          .patch(`/api/users/${targetUser.id}`)
          .set(headers)
          .send({ firstName: 'Concurrent1' }),
        request(app.getHttpServer())
          .patch(`/api/users/${targetUser.id}`)
          .set(headers)
          .send({ lastName: 'Concurrent2' }),
      ];

      const responses = await Promise.all(requests);

      // Both should succeed or handle conflicts gracefully
      responses.forEach(response => {
        expect([200, 409]).toContain(response.status);
      });
    });

    it('should validate admin operations with transaction safety', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const targetUser = await dbManager.createTestUser();

      const updateData = {
        firstName: 'TransactionTest',
        lastName: 'AdminUpdate',
        role: Role.MODERATOR,
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUser.id}`)
        .set(headers)
        .send(updateData)
        .expect(200);

      // Verify all fields were updated atomically
      const { data } = response.body;
      expect(data.firstName).toBe(updateData.firstName);
      expect(data.lastName).toBe(updateData.lastName);
      expect(data.role).toBe(updateData.role);
      expect(data.isActive).toBe(updateData.isActive);

      // Verify in database
      const updatedUser = await dbManager.findUserByEmail(targetUser.email);
      expect(updatedUser.firstName).toBe(updateData.firstName);
      expect(updatedUser.role).toBe(updateData.role);
      expect(updatedUser.isActive).toBe(updateData.isActive);
    });
  });
});
