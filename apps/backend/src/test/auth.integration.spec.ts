import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { TestDatabaseManager } from './test-database.setup';
import { PrismaService } from '../app/database/prisma.service';
import { PasswordService } from '../app/common/services/password.service';
import { AppConfigService } from '../app/config/config.service';
import { Role } from '@prisma/client';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let passwordService: PasswordService;
  let testDbManager: TestDatabaseManager;

  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeAll(async () => {
    // Setup test database
    testDbManager = TestDatabaseManager.getInstance();
    await testDbManager.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as main.ts
    const configService = app.get(AppConfigService);
    app.setGlobalPrefix(configService.apiPrefix);

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

    // Apply global interceptors and filters like main.ts
    const { GlobalExceptionFilter } = await import('../app/common/filters/global-exception.filter');
    const { TransformInterceptor } = await import(
      '../app/common/interceptors/transform.interceptor'
    );

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    passwordService = app.get<PasswordService>(PasswordService);
  });

  afterAll(async () => {
    await app.close();
    await testDbManager.teardownDatabase();
  });

  beforeEach(async () => {
    await testDbManager.cleanDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            id: expect.any(String),
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: Role.USER,
          },
        },
      });

      // Verify user was created in database
      const createdUser = await prismaService.user.findUnique({
        where: { email: testUser.email },
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser?.email).toBe(testUser.email);
      expect(createdUser?.role).toBe(Role.USER);
      expect(createdUser?.isActive).toBe(true);
    });

    it('should return 409 for duplicate email', async () => {
      // Create user first
      const hashedPassword = await passwordService.hashPassword(testUser.password);
      await prismaService.user.create({
        data: {
          ...testUser,
          password: hashedPassword,
          role: Role.USER,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT_ERROR');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          password: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          // Missing password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await passwordService.hashPassword(testUser.password);
      await prismaService.user.create({
        data: {
          ...testUser,
          password: hashedPassword,
          role: Role.USER,
        },
      });
    });

    it('should login user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: Role.USER,
          },
        },
      });
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 401 for inactive user', async () => {
      // Deactivate user
      await prismaService.user.update({
        where: { email: testUser.email },
        data: { isActive: false },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login user to get refresh token
      const hashedPassword = await passwordService.hashPassword(testUser.password);
      await prismaService.user.create({
        data: {
          ...testUser,
          password: hashedPassword,
          role: Role.USER,
        },
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            email: testUser.email,
          },
        },
      });

      // New tokens should be different
      expect(response.body.data.accessToken).not.toBe(refreshToken);
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login user to get access token
      const hashedPassword = await passwordService.hashPassword(testUser.password);
      await prismaService.user.create({
        data: {
          ...testUser,
          password: hashedPassword,
          role: Role.USER,
        },
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          role: Role.USER,
          isActive: true,
        },
      });

      // Should not include password
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/change-password', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login user
      const hashedPassword = await passwordService.hashPassword(testUser.password);
      await prismaService.user.create({
        data: {
          ...testUser,
          password: hashedPassword,
          role: Role.USER,
        },
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should change password successfully', async () => {
      const newPassword = 'NewPassword123!';

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword,
        })
        .expect(204);

      // Verify old password no longer works
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // Verify new password works
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);
    });

    it('should return 401 for incorrect current password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak new password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/health').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'ok',
          timestamp: expect.any(String),
        },
      });
    });
  });
});
