import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from '../common/services/password.service';
import { JwtService } from './jwt.service';
import { CacheService } from '../common/cache/cache.service';
import { User, Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let passwordService: jest.Mocked<PasswordService>;
  let jwtService: jest.Mocked<JwtService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: Role.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockAuthResponse = {
    accessToken: mockTokens.accessToken,
    refreshToken: mockTokens.refreshToken,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: mockUser.role,
    },
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      updatePassword: jest.fn(),
    };

    const mockPasswordService = {
      validatePasswordStrength: jest.fn(),
      comparePassword: jest.fn(),
      needsRehash: jest.fn(),
    };

    const mockJwtService = {
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
      createAuthResponse: jest.fn(),
      getTokenExpiration: jest.fn(),
    };

    const mockCacheService = {
      set: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    passwordService = module.get(PasswordService);
    jwtService = module.get(JwtService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
        score: 4,
      });
      usersService.create.mockResolvedValue(mockUser as any);
      jwtService.generateTokens.mockResolvedValue(mockTokens);
      jwtService.createAuthResponse.mockReturnValue(mockAuthResponse);

      const result = await service.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(registerDto.password);
      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        role: Role.USER,
        isActive: true,
      });
      expect(jwtService.generateTokens).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
    });

    it('should throw BadRequestException for weak password', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        score: 1,
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.needsRehash.mockReturnValue(false);
      jwtService.generateTokens.mockResolvedValue(mockTokens);
      jwtService.createAuthResponse.mockReturnValue(mockAuthResponse);

      const result = await service.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password
      );
      expect(jwtService.generateTokens).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByEmail.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password
      );
    });

    it('should rehash password if needed', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.needsRehash.mockReturnValue(true);
      usersService.updatePassword.mockResolvedValue(undefined);
      jwtService.generateTokens.mockResolvedValue(mockTokens);
      jwtService.createAuthResponse.mockReturnValue(mockAuthResponse);

      await service.login(loginDto);

      expect(passwordService.needsRehash).toHaveBeenCalledWith(mockUser.password);
      expect(usersService.updatePassword).toHaveBeenCalledWith(mockUser.id, loginDto.password);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'mock-refresh-token',
    };

    it('should refresh token successfully', async () => {
      const mockPayload = { sub: mockUser.id, type: 'refresh' };
      
      jwtService.verifyRefreshToken.mockResolvedValue(mockPayload);
      cacheService.exists.mockResolvedValue({ success: true, data: false });
      usersService.findOne.mockResolvedValue(mockUser as any);
      jwtService.generateTokens.mockResolvedValue(mockTokens);
      jwtService.createAuthResponse.mockReturnValue(mockAuthResponse);
      jwtService.getTokenExpiration.mockReturnValue(new Date(Date.now() + 3600000));
      cacheService.set.mockResolvedValue({ success: true, data: true });

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toEqual(mockAuthResponse);
      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(usersService.findOne).toHaveBeenCalledWith(mockPayload.sub);
      expect(jwtService.generateTokens).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException for blacklisted token', async () => {
      const mockPayload = { sub: mockUser.id, type: 'refresh' };
      
      jwtService.verifyRefreshToken.mockResolvedValue(mockPayload);
      cacheService.exists.mockResolvedValue({ success: true, data: true });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const mockPayload = { sub: 'non-existent-user', type: 'refresh' };
      
      jwtService.verifyRefreshToken.mockResolvedValue(mockPayload);
      cacheService.exists.mockResolvedValue({ success: true, data: false });
      usersService.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const mockPayload = { sub: mockUser.id, type: 'refresh' };
      const inactiveUser = { ...mockUser, isActive: false };
      
      jwtService.verifyRefreshToken.mockResolvedValue(mockPayload);
      cacheService.exists.mockResolvedValue({ success: true, data: false });
      usersService.findOne.mockResolvedValue(inactiveUser as any);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const refreshToken = 'mock-refresh-token';
      
      jwtService.verifyRefreshToken.mockResolvedValue({ sub: mockUser.id, type: 'refresh' });
      jwtService.getTokenExpiration.mockReturnValue(new Date(Date.now() + 3600000));
      cacheService.set.mockResolvedValue({ success: true, data: true });

      await expect(service.logout(refreshToken)).resolves.not.toThrow();
      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should not throw error for invalid token during logout', async () => {
      const refreshToken = 'invalid-token';
      
      jwtService.verifyRefreshToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.logout(refreshToken)).resolves.not.toThrow();
    });
  });

  describe('validateUser', () => {
    it('should return user for valid user ID', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await service.validateUser(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return null for invalid user ID', async () => {
      usersService.findOne.mockRejectedValue(new Error('User not found'));

      const result = await service.validateUser('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const currentPassword = 'oldPassword';
    const newPassword = 'NewPassword123!';

    it('should change password successfully', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
        score: 4,
      });
      usersService.updatePassword.mockResolvedValue(undefined);

      await expect(service.changePassword(userId, currentPassword, newPassword))
        .resolves.not.toThrow();

      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        currentPassword,
        mockUser.password
      );
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(newPassword);
      expect(usersService.updatePassword).toHaveBeenCalledWith(userId, newPassword);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.changePassword(userId, currentPassword, newPassword))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);
      passwordService.comparePassword.mockResolvedValue(false);

      await expect(service.changePassword(userId, currentPassword, newPassword))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for weak new password', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
        score: 1,
      });

      await expect(service.changePassword(userId, currentPassword, newPassword))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });
});