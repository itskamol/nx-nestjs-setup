import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../common/services/password.service';
import { CacheService } from '../common/cache/cache.service';
import { Role as PrismaRole, User } from '@prisma/client';
import { Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const mockPasswordService = {
  validatePasswordStrength: jest.fn(),
  hashPassword: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: PrismaRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsers: User[] = [
    mockUser,
    {
      id: 'user-456',
      email: 'admin@example.com',
      password: 'hashedPassword',
      firstName: 'Admin',
      lastName: 'User',
      role: PrismaRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    Object.values(mockPrismaService.user).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPasswordService).forEach(mockFn => mockFn.mockReset());
    Object.values(mockCacheService).forEach(mockFn => mockFn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      role: Role.USER,
    };

    it('should create a user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
        score: 4,
      });
      mockPasswordService.hashPassword.mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockCacheService.set.mockResolvedValue({ success: true, data: true });

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(mockUser.email);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(createUserDto.password);
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(createUserDto.password);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDto,
          password: 'hashedPassword',
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
    });

    it('should throw BadRequestException for weak password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        score: 1,
      });

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
      expect(result.data).toHaveLength(2);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter users by search term', async () => {
      const searchTerm = 'test';
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll({ search: searchTerm });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter users by role', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll({ role: 'USER' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: 'USER' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter users by active status', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll({ isActive: true });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return user from cache if available', async () => {
      mockCacheService.get.mockResolvedValue({ success: true, data: mockUser });

      const result = await service.findOne(mockUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:${mockUser.id}`);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return user from database and cache it', async () => {
      mockCacheService.get.mockResolvedValue({ success: true, data: null });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockCacheService.set.mockResolvedValue({ success: true, data: true });

      const result = await service.findOne(mockUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(`user:${mockUser.id}`, mockUser, { ttl: 900 });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockCacheService.get.mockResolvedValue({ success: true, data: null });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockCacheService.set.mockResolvedValue({ success: true, data: true });

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result).toBeDefined();
      expect(result.firstName).toBe(updateUserDto.firstName);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updateUserDto,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateUserDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const updateWithEmail = { ...updateUserDto, email: 'existing@example.com' };
      const existingUser = { ...mockUser, id: 'different-id' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for user existence
        .mockResolvedValueOnce(existingUser); // Second call for email conflict

      await expect(service.update(mockUser.id, updateWithEmail)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);
      mockCacheService.del.mockResolvedValue({ success: true, data: 1 });

      await expect(service.remove(mockUser.id)).resolves.not.toThrow();

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${mockUser.id}`);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePassword', () => {
    const newPassword = 'NewPassword123!';

    it('should update password successfully', async () => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
        score: 4,
      });
      mockPasswordService.hashPassword.mockResolvedValue('newHashedPassword');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockCacheService.del.mockResolvedValue({ success: true, data: 1 });

      await expect(service.updatePassword(mockUser.id, newPassword)).resolves.not.toThrow();

      expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(newPassword);
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'newHashedPassword' },
      });
    });

    it('should throw BadRequestException for weak password', async () => {
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        score: 1,
      });

      await expect(service.updatePassword(mockUser.id, newPassword)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(deactivatedUser);
      mockCacheService.set.mockResolvedValue({ success: true, data: true });

      const result = await service.deactivateUser(mockUser.id);

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: false },
      });
    });
  });

  describe('activateUser', () => {
    it('should activate user', async () => {
      const activatedUser = { ...mockUser, isActive: true };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(activatedUser);
      mockCacheService.set.mockResolvedValue({ success: true, data: true });

      const result = await service.activateUser(mockUser.id);

      expect(result.isActive).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: true },
      });
    });
  });
});
