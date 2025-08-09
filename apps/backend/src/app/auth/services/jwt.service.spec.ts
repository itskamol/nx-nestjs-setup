import { Test, TestingModule } from '@nestjs/testing';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { AppConfigService } from '@backend/app/config/config.service';
import { Role, User } from '@prisma/client';

describe('JwtService', () => {
  let service: JwtService;
  let nestJwtService: jest.Mocked<NestJwtService>;

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

  const mockJwtConfig = {
    secret: 'test-secret',
    expiresIn: '15m',
    refreshSecret: 'test-refresh-secret',
    refreshExpiresIn: '7d',
  };

  beforeEach(async () => {
    const mockNestJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfigService = {
      jwt: mockJwtConfig,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: NestJwtService,
          useValue: mockNestJwtService,
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    nestJwtService = module.get(NestJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      nestJwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await service.generateTokens(mockUser);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });

      expect(nestJwtService.sign).toHaveBeenCalledTimes(2);

      // Check access token call
      expect(nestJwtService.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        {
          secret: mockJwtConfig.secret,
          expiresIn: mockJwtConfig.expiresIn,
        }
      );

      // Check refresh token call
      expect(nestJwtService.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sub: mockUser.id, type: 'refresh' }),
        {
          secret: mockJwtConfig.refreshSecret,
          expiresIn: mockJwtConfig.refreshExpiresIn,
        }
      );
    });

    it('should throw error when token generation fails', async () => {
      nestJwtService.sign.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      await expect(service.generateTokens(mockUser)).rejects.toThrow('Token generation failed');
    });
  });

  describe('verifyAccessToken', () => {
    const mockToken = 'mock-access-token';
    const mockPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    };

    it('should verify and return payload for valid token', async () => {
      nestJwtService.verify.mockReturnValue(mockPayload);

      const result = await service.verifyAccessToken(mockToken);

      expect(result).toEqual(mockPayload);
      expect(nestJwtService.verify).toHaveBeenCalledWith(mockToken, {
        secret: mockJwtConfig.secret,
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      nestJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyAccessToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for token with missing payload fields', async () => {
      const invalidPayload = { sub: mockUser.id }; // Missing email and role
      nestJwtService.verify.mockReturnValue(invalidPayload);

      await expect(service.verifyAccessToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyRefreshToken', () => {
    const mockRefreshToken = 'mock-refresh-token';
    const mockPayload = {
      sub: mockUser.id,
      type: 'refresh',
    };

    it('should verify and return payload for valid refresh token', async () => {
      nestJwtService.verify.mockReturnValue(mockPayload);

      const result = await service.verifyRefreshToken(mockRefreshToken);

      expect(result).toEqual(mockPayload);
      expect(nestJwtService.verify).toHaveBeenCalledWith(mockRefreshToken, {
        secret: mockJwtConfig.refreshSecret,
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      nestJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyRefreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for token with wrong type', async () => {
      const invalidPayload = { sub: mockUser.id, type: 'access' };
      nestJwtService.verify.mockReturnValue(invalidPayload);

      await expect(service.verifyRefreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'mock-token';
      const authHeader = `Bearer ${token}`;

      const result = service.extractTokenFromHeader(authHeader);

      expect(result).toBe(token);
    });

    it('should throw UnauthorizedException for missing header', () => {
      expect(() => service.extractTokenFromHeader('')).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid header format', () => {
      expect(() => service.extractTokenFromHeader('Invalid header')).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for missing token', () => {
      expect(() => service.extractTokenFromHeader('Bearer ')).toThrow(UnauthorizedException);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const mockToken = 'mock-token';
      const mockDecoded = { sub: 'user-123', email: 'test@example.com' };

      nestJwtService.decode.mockReturnValue(mockDecoded);

      const result = service.decodeToken(mockToken);

      expect(result).toEqual(mockDecoded);
      expect(nestJwtService.decode).toHaveBeenCalledWith(mockToken);
    });

    it('should return null for invalid token', () => {
      nestJwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.decodeToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nestJwtService.decode.mockReturnValue({ exp: futureExp });

      const result = service.isTokenExpired('mock-token');

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      nestJwtService.decode.mockReturnValue({ exp: pastExp });

      const result = service.isTokenExpired('mock-token');

      expect(result).toBe(true);
    });

    it('should return true for token without exp claim', () => {
      nestJwtService.decode.mockReturnValue({ sub: 'user-123' });

      const result = service.isTokenExpired('mock-token');

      expect(result).toBe(true);
    });

    it('should return true for invalid token', () => {
      nestJwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.isTokenExpired('invalid-token');

      expect(result).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nestJwtService.decode.mockReturnValue({ exp });

      const result = service.getTokenExpiration('mock-token');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(exp * 1000);
    });

    it('should return null for token without exp claim', () => {
      nestJwtService.decode.mockReturnValue({ sub: 'user-123' });

      const result = service.getTokenExpiration('mock-token');

      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      nestJwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.getTokenExpiration('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('createAuthResponse', () => {
    it('should create auth response with user data and tokens', () => {
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      const result = service.createAuthResponse(mockUser, tokens);

      expect(result).toEqual({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        },
      });
    });
  });
});
