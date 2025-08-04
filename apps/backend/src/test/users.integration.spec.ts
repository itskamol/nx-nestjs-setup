import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { TestDatabaseManager } from './test-database.setup';
import { PrismaService } from '../app/database/prisma.service';
import { PasswordService } from '../app/common/services/password.service';
import { Role } from '@prisma/client';

describe('Users Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let passwordService: PasswordService;
  let testDbManager: TestDatabaseManager;

  let adminToken: string;
  let userToken: string;
  let moderatorToken: string;

  const adminUser = {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    role: Role.ADMIN,
  };

  const regularUser = {
    email: 'user@example.com',
    password: 'UserPassword123!',
    firstName: 'Regular',
    lastName: 'User',
    role: Role.USER,
  };

  const moderatorUser = {
    email: 'moderator@example.com',
    password: 'ModeratorPassword123!',
    firstName: 'Moderator',
    lastName: 'User',
    role: Role.MODERATOR,
  };

  beforeAll(async () => {
    // Setup test database
    testDbManager = TestDatabaseManager.getInstance();
    await testDbManager.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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

    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    passwordService = app.get<PasswordService>(PasswordService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await testDbManager.teardownDatabase();
  });

  beforeEach(async () => {
    await testDbManager.cleanDatabase();

    // Create test users and get tokens
    const users = [adminUser, regularUser, moderatorUser];
    const tokens = [];

    for (const user of users) {
      const hashedPassword = await passwordService.hashPassword(user.password);
      await prismaService.user.create({
        data: {
          ...user,
          password: hashedPassword,
        },
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: user.email,
        password: user.password,
      });

      tokens.push(loginResponse.body.data.accessToken);
    }

    [adminToken, userToken, moderatorToken] = tokens;
  });

  describe('POST /users', () => {
    const newUser = {
      email: 'newuser@example.com',
      password: 'NewUserPassword123!',
      firstName: 'New',
      lastName: 'User',
      role: Role.USER,
    };

    it('should create user as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isActive: true,
        },
      });

      // Should not include password
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 403 for regular user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newUser)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return 403 for moderator', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(newUser)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/api/users').send(newUser).expect(401);
    });
  });

  describe('GET /users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      });

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).not.toHaveProperty('password');
    });

    it('should get all users as moderator', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should return 403 for regular user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter users by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe(adminUser.email);
    });

    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?role=USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].role).toBe(Role.USER);
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });
  });

  describe('GET /users/me', () => {
    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          email: regularUser.email,
          firstName: regularUser.firstName,
          lastName: regularUser.lastName,
          role: regularUser.role,
        },
      });

      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/users/me').expect(401);
    });
  });

  describe('GET /users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prismaService.user.findUnique({
        where: { email: regularUser.email },
      });
      userId = user!.id;
    });

    it('should get user by ID as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: userId,
          email: regularUser.email,
          firstName: regularUser.firstName,
          lastName: regularUser.lastName,
          role: regularUser.role,
        },
      });
    });

    it('should get user by ID as moderator', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 for regular user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });
  });

  describe('PATCH /users/me', () => {
    it('should update own profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: regularUser.email,
          role: regularUser.role,
        },
      });
    });

    it('should not allow role update in own profile', async () => {
      const updateData = {
        firstName: 'Updated',
        role: Role.ADMIN, // This should be ignored
      };

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.role).toBe(regularUser.role); // Should remain USER
    });
  });

  describe('PATCH /users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prismaService.user.findUnique({
        where: { email: regularUser.email },
      });
      userId = user!.id;
    });

    it('should update user as admin', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        role: Role.MODERATOR,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          role: updateData.role,
        },
      });
    });

    it('should return 403 for regular user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prismaService.user.findUnique({
        where: { email: regularUser.email },
      });
      userId = user!.id;
    });

    it('should delete user as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify user was deleted
      const deletedUser = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 403 for regular user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /users/:id/activate', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prismaService.user.findUnique({
        where: { email: regularUser.email },
      });
      userId = user!.id;

      // Deactivate user first
      await prismaService.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
    });

    it('should activate user as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.isActive).toBe(true);
    });

    it('should return 403 for regular user', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${userId}/activate`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PATCH /users/:id/deactivate', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prismaService.user.findUnique({
        where: { email: regularUser.email },
      });
      userId = user!.id;
    });

    it('should deactivate user as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 403 for regular user', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
