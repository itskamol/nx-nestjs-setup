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

describe('Auth Registration and Login E2E Tests', () => {
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

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = DataFactory.createRegistrationData({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      TestHelpers.expectAuthResponse(response, 201);

      // Validate response structure
      const { data } = response.body;
      expect(data.user.email).toBe(userData.email);
      expect(data.user.firstName).toBe(userData.firstName);
      expect(data.user.lastName).toBe(userData.lastName);
      expect(data.user.role).toBe('USER');
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();

      // Ensure password is not in response
      expect(data.user.password).toBeUndefined();

      // Verify user was created in database
      const createdUser = await dbManager.findUserByEmail(userData.email);
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
    });

    it('should register user with minimal required data', async () => {
      const userData = DataFactory.createRegistrationData();

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
        })
        .expect(201);

      TestHelpers.expectAuthResponse(response, 201);
      expect(response.body.data.user.role).toBe('USER');
      expect(response.body.data.user.isActive).toBe(true);
    });

    it('should fail with invalid email format', async () => {
      const userData = DataFactory.createRegistrationData({
        email: 'invalid-email-format',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      TestHelpers.expectValidationError(response, 'email');
    });

    it('should fail with weak password', async () => {
      const userData = DataFactory.createRegistrationData({
        password: '123', // Too short
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      TestHelpers.expectValidationError(response, 'password');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail with empty string fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
          firstName: '', // Empty string
          lastName: '', // Empty string
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail when user already exists', async () => {
      const userData = DataFactory.createRegistrationData();

      // First registration should succeed
      await request(app.getHttpServer()).post('/api/auth/register').send(userData).expect(201);

      // Second registration with same email should fail
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      TestHelpers.expectConflictResponse(response);
    });

    it('should handle case-insensitive email uniqueness', async () => {
      const userData = DataFactory.createRegistrationData({
        email: 'Test@Example.com',
      });

      // First registration
      await request(app.getHttpServer()).post('/api/auth/register').send(userData).expect(201);

      // Second registration with different case should fail
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...userData,
          email: 'test@example.com', // Different case
        })
        .expect(409);

      TestHelpers.expectConflictResponse(response);
    });

    it('should trim whitespace from email', async () => {
      const userData = DataFactory.createRegistrationData({
        email: '  test@example.com  ', // With whitespace
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should validate password complexity requirements', async () => {
      const weakPasswords = [
        'password', // No numbers or special chars
        '12345678', // Only numbers
        'PASSWORD', // Only uppercase
        'password123', // No special chars
        'Pass1!', // Too short
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
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a test user first
      const userData = DataFactory.createRegistrationData();
      const testUser = await dbManager.createTestUser(userData);

      const loginData = {
        email: testUser.email,
        password: testUser.password, // Use original password
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      TestHelpers.expectAuthResponse(response, 200);

      // Validate response data
      const { data } = response.body;
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.id).toBe(testUser.id);
      expect(data.user.role).toBe(testUser.role);
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();

      // Ensure password is not in response
      expect(data.user.password).toBeUndefined();
    });

    it('should login with different user roles', async () => {
      // Test admin login
      const adminUser = await dbManager.createAdminUser();
      let response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: adminUser.password,
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('ADMIN');

      // Test moderator login
      const moderatorUser = await dbManager.createModeratorUser();
      response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: moderatorUser.email,
          password: moderatorUser.password,
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('MODERATOR');

      // Test regular user login
      const regularUser = await dbManager.createRegularUser();
      response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: regularUser.email,
          password: regularUser.password,
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('USER');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPassword123!',
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with invalid password', async () => {
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should fail with malformed email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'ValidPassword123!',
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'email');
    });

    it('should fail with missing credentials', async () => {
      // Missing password
      let response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      TestHelpers.expectValidationError(response);

      // Missing email
      response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          password: 'ValidPassword123!',
        })
        .expect(400);

      TestHelpers.expectValidationError(response);

      // Missing both
      response = await request(app.getHttpServer()).post('/api/auth/login').send({}).expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should fail with empty credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '',
          password: '',
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });

    it('should handle case-insensitive email login', async () => {
      const testUser = await dbManager.createTestUser({
        email: 'Test@Example.com',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com', // Different case
          password: testUser.password,
        })
        .expect(200);

      TestHelpers.expectAuthResponse(response);
    });

    it('should fail for inactive user', async () => {
      const testUser = await dbManager.createTestUser({
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      TestHelpers.expectUnauthorizedResponse(response);
    });

    it('should validate JWT token structure', async () => {
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const { accessToken } = response.body.data;

      // Decode token to validate structure
      const decodedToken = authUtils.decodeToken(accessToken);
      expect(decodedToken).toHaveProperty('sub', testUser.id);
      expect(decodedToken).toHaveProperty('email', testUser.email);
      expect(decodedToken).toHaveProperty('role', testUser.role);
      expect(decodedToken).toHaveProperty('iat');
      expect(decodedToken).toHaveProperty('exp');
    });

    it('should return different tokens for different login sessions', async () => {
      const testUser = await dbManager.createTestUser();
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      // First login
      const response1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Second login (after a small delay)
      await TestHelpers.sleep(1000);
      const response2 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Tokens should be different
      expect(response1.body.data.accessToken).not.toBe(response2.body.data.accessToken);
      expect(response1.body.data.refreshToken).not.toBe(response2.body.data.refreshToken);
    });
  });

  describe('Authentication Response Security', () => {
    it('should not expose sensitive data in responses', async () => {
      const userData = DataFactory.createRegistrationData();

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      TestHelpers.expectNoSensitiveData(response);
    });

    it('should include security headers', async () => {
      const userData = DataFactory.createRegistrationData();

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      TestHelpers.expectSecurityHeaders(response);
    });

    it('should validate response time is reasonable', async () => {
      const testUser = await dbManager.createTestUser();

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      TestHelpers.expectResponseTime(response, 2000); // 2 seconds max
    });
  });
});
