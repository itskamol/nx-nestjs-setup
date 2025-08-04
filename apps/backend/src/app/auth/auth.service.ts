import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PasswordService } from '../common/services/password.service';
import { JwtService } from './jwt.service';
import { CacheService } from '../common/cache/cache.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponse, Role } from '@shared/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly blacklistPrefix = 'blacklist';

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Validate password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(
        registerDto.password
      );

      if (!passwordValidation.isValid) {
        throw new BadRequestException({
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors,
        });
      }

      // Create user with default role
      const userDto = {
        ...registerDto,
        role: Role.USER,
        isActive: true,
      };

      const user = await this.usersService.create(userDto);

      // Generate tokens
      const tokens = await this.jwtService.generateTokens(user as any);

      this.logger.log(`User registered successfully: ${user.email}`);

      return this.jwtService.createAuthResponse(user as User, tokens);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Registration failed', error);
      throw new Error('Registration failed');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await this.passwordService.comparePassword(
        loginDto.password,
        user.password
      );

      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if password needs rehashing
      if (this.passwordService.needsRehash(user.password)) {
        this.logger.log(`Rehashing password for user: ${user.email}`);
        await this.usersService.updatePassword(user.id, loginDto.password);
      }

      // Generate tokens
      const tokens = await this.jwtService.generateTokens(user);

      this.logger.log(`User logged in successfully: ${user.email}`);

      return this.jwtService.createAuthResponse(user, tokens);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Login failed', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyRefreshToken(refreshTokenDto.refreshToken);

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(refreshTokenDto.refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Find user
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if user is active
      if (!(user as any).isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate new tokens
      const tokens = await this.jwtService.generateTokens(user as any);

      // Blacklist the old refresh token
      await this.blacklistToken(refreshTokenDto.refreshToken);

      this.logger.log(`Token refreshed for user: ${(user as any).email}`);

      return this.jwtService.createAuthResponse(user as any, tokens);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // Verify the refresh token before blacklisting
      await this.jwtService.verifyRefreshToken(refreshToken);

      // Blacklist the refresh token
      await this.blacklistToken(refreshToken);

      this.logger.log('User logged out successfully');
    } catch (error) {
      this.logger.error('Logout failed', error);
      // Don't throw error for logout - just log it
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    try {
      const user = await this.usersService.findOne(userId);
      return user as any;
    } catch (error) {
      this.logger.error(`User validation failed for ID: ${userId}`, error);
      return null;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Get user
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.passwordService.comparePassword(
        currentPassword,
        (user as any).password
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);

      if (!passwordValidation.isValid) {
        throw new BadRequestException({
          message: 'New password does not meet security requirements',
          errors: passwordValidation.errors,
        });
      }

      // Update password
      await this.usersService.updatePassword(userId, newPassword);

      this.logger.log(`Password changed for user: ${userId}`);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Password change failed for user: ${userId}`, error);
      throw new Error('Password change failed');
    }
  }

  // Token blacklist management
  private async blacklistToken(token: string): Promise<void> {
    try {
      const expiration = this.jwtService.getTokenExpiration(token);
      if (!expiration) {
        return;
      }

      const ttl = Math.floor((expiration.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        const cacheKey = `${this.blacklistPrefix}:${token}`;
        await this.cacheService.set(cacheKey, true, { ttl });
      }
    } catch (error) {
      this.logger.error('Failed to blacklist token', error);
    }
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const cacheKey = `${this.blacklistPrefix}:${token}`;
      const result = await this.cacheService.exists(cacheKey);
      return result.success ? result.data || false : false;
    } catch (error) {
      this.logger.error('Failed to check token blacklist', error);
      return false;
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
