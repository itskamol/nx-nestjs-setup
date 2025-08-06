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

describe('Users CRUD Operations E2E Tests', () => {
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

  describe('POST /api/users - Create User (Admin Only)', () => {
    it('should create a new user as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const userData = DataFactory.createUserData({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: Role.USER,
      });

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(userData)
        .expect(201);

      TestHelpers.expectUserResponse(response, 201);

      // Validate response data
      const { data } = response.body;
      expect(data.email).toBe(userData.email);
      expect(data.firstName).toBe(userData.firstName);
      expect(data.lastName).toBe(userData.lastName);
      expect(data.role).toBe(userData.role);
      expect(data.isActive).toBe(true);
      expect(data.password).toBeUndefined();

      // Verify user was created in database
      const createdUser = await dbManager.findUserByEmail(userData.email);
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
    });

    it('should create user with different roles as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create admin user
      const adminData = DataFactory.createAdminUserData({
        email: 'admin@example.com',
      });

      let response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(adminData)
        .expect(201);

      expect(response.body.data.role).toBe('ADMIN');

      // Create moderator user
      const moderatorData = DataFactory.createModeratorUserData({
        email: 'moderator@example.com',
      });

      response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(moderatorData)
        .expect(201);

      expect(response.body.data.role).toBe('MODERATOR');

      // Create regular user
      const userData = DataFactory.createUserData({
        email: 'user@example.com',
      });

      response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(userData)
        .expect(201);

      expect(response.body.data.role).toBe('USER');
    });

    it('should fail to create user as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const userData = DataFactory.createUserData();

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(userData)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to create user as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const userData = DataFactory.createUserData();

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(userData)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail to create user without authentication', async () => {
      const userData = DataFactory.createUserData();

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(userData)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with invalid user data', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send({
          email: 'invalid-email',
          password: '123', // Too short
          firstName: '',
          lastName: '',
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail when creating user with existing email', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const userData = DataFactory.createUserData();

      // Create first user
      await request(app.getHttpServer()).post('/api/users').set(headers).send(userData).expect(201);

      // Try to create second user with same email
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set(headers)
        .send(userData)
        .expect(409);

      TestHelpers.expectConflictResponse(response);
    });

    it('should validate required fields', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const requiredFields = ['email', 'password', 'firstName', 'lastName'];

      for (const field of requiredFields) {
        const userData = DataFactory.createUserData();
        delete userData[field];

        const response = await request(app.getHttpServer())
          .post('/api/users')
          .set(headers)
          .send(userData)
          .expect(400);

        TestHelpers.expectValidationError(response, field);
      }
    });
  });

  describe('GET /api/users - List Users (Admin/Moderator)', () => {
    it('should get paginated user list as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create test users
      await dbManager.seedUsers(5, Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data, pagination } = response.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(pagination.total).toBeGreaterThan(0);

      // Validate user structure
      data.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('isActive');
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should get paginated user list as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);

      // Create test users
      await dbManager.seedUsers(3, Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);
    });

    it('should fail to get user list as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should support pagination parameters', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create test users
      await dbManager.seedUsers(10, Role.USER);

      // Test with pagination
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ page: 1, limit: 5 })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 5);

      const { pagination } = response.body;
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(5);
      expect(pagination.total).toBeGreaterThan(5);
    });

    it('should support search functionality', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create users with specific names
      await dbManager.createTestUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });
      await dbManager.createTestUser({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      });

      // Search for John
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ search: 'John' })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      const johnUser = data.find(user => user.firstName === 'John');
      expect(johnUser).toBeDefined();
    });

    it('should support role filtering', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create users with different roles
      await dbManager.createAdminUser();
      await dbManager.createModeratorUser();
      await dbManager.createRegularUser();

      // Filter by ADMIN role
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ role: 'ADMIN' })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      data.forEach(user => {
        expect(user.role).toBe('ADMIN');
      });
    });

    it('should support active status filtering', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create active and inactive users
      await dbManager.createTestUser({ isActive: true });
      await dbManager.createTestUser({ isActive: false });

      // Filter by active status
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ isActive: true })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response);

      const { data } = response.body;
      data.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should handle empty results gracefully', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ search: 'nonexistent' })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 0);

      const { data, pagination } = response.body;
      expect(data).toHaveLength(0);
      expect(pagination.total).toBe(0);
    });
  });

  describe('GET /api/users/:id - Get Specific User (Admin/Moderator)', () => {
    it('should get specific user by ID as admin', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${testUser.id}`)
        .set(headers)
        .expect(200);

      TestHelpers.expectUserResponse(response);

      const { data } = response.body;
      expect(data.id).toBe(testUser.id);
      expect(data.email).toBe(testUser.email);
      expect(data.firstName).toBe(testUser.firstName);
      expect(data.lastName).toBe(testUser.lastName);
      expect(data.role).toBe(testUser.role);
      expect(data.password).toBeUndefined();
    });

    it('should get specific user by ID as moderator', async () => {
      const { headers } = await authUtils.createTestScenario(Role.MODERATOR);
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${testUser.id}`)
        .set(headers)
        .expect(200);

      TestHelpers.expectUserResponse(response);
    });

    it('should fail to get specific user as regular user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.USER);
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${testUser.id}`)
        .set(headers)
        .expect(403);

      TestHelpers.expectForbiddenResponse(response);
    });

    it('should fail with non-existent user ID', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const nonExistentId = 'non-existent-id';

      const response = await request(app.getHttpServer())
        .get(`/api/users/${nonExistentId}`)
        .set(headers)
        .expect(404);

      TestHelpers.expectNotFoundResponse(response);
    });

    it('should fail with invalid user ID format', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const invalidId = 'invalid-id-format';

      const response = await request(app.getHttpServer())
        .get(`/api/users/${invalidId}`)
        .set(headers)
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail without authentication', async () => {
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${testUser.id}`)
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should include all user fields except password', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${testUser.id}`)
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

      // Should not include password
      TestHelpers.expectObjectMissingProperties(data, ['password']);

      // Validate date fields
      TestHelpers.expectValidDateString(data.createdAt);
      TestHelpers.expectValidDateString(data.updatedAt);
    });

    it('should handle concurrent requests for same user', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      // Make multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer()).get(`/api/users/${testUser.id}`).set(headers)
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        TestHelpers.expectUserResponse(response);
        expect(response.body.data.id).toBe(testUser.id);
      });
    });
  });

  describe('Response Security and Performance', () => {
    it('should not expose sensitive data in user responses', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/api/users/${testUser.id}`)
        .set(headers)
        .expect(200);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should have reasonable response times', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create multiple users for list endpoint
      await dbManager.seedUsers(10, Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set(headers)
        .expect(200);

      TestHelpers.expectResponseTime(response, 3000); // 3 seconds max
    });

    it('should include security headers', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set(headers)
        .expect(200);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should handle large datasets efficiently', async () => {
      const { headers } = await authUtils.createTestScenario(Role.ADMIN);

      // Create many users
      await dbManager.seedUsers(50, Role.USER);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ limit: 20 })
        .set(headers)
        .expect(200);

      TestHelpers.expectPaginatedResponse(response, 20);
      TestHelpers.expectResponseTime(response, 5000); // 5 seconds max for large dataset
    });
  });
});
