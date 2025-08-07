import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { CacheService, PasswordService } from '../../common';
import { LoginDto, RefreshTokenDto, RegisterDto } from '../dto';
import { AuthResponse } from '@shared/types';
import { Role } from '@prisma/client';
import { JwtService } from './jwt.service';

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
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    this.validatePassword(registerDto.password);

    const userDto = {
      ...registerDto,
      role: Role.USER,
      isActive: true,
    };

    const user = await this.usersService.create(userDto);
    const tokens = await this.jwtService.generateTokens(user);

    this.logger.log(`User registered successfully: ${user.email}`);

    return this.jwtService.createAuthResponse(user, tokens);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      loginDto.password,
      user.password
    );

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (this.passwordService.needsRehash(user.password)) {
      this.logger.log(`Rehashing password for user: ${user.email}`);
      await this.usersService.updatePassword(user.id, loginDto.password);
    }

    const tokens = await this.jwtService.generateTokens(user);

    this.logger.log(`User logged in successfully: ${user.email}`);

    return this.jwtService.createAuthResponse(user, tokens);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    const payload = await this.jwtService.verifyRefreshToken(refreshTokenDto.refreshToken);

    const isBlacklisted = await this.isTokenBlacklisted(refreshTokenDto.refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.jwtService.generateTokens(user);
    await this.blacklistToken(refreshTokenDto.refreshToken);

    this.logger.log(`Token refreshed for user: ${user.email}`);

    return this.jwtService.createAuthResponse(user, tokens);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.jwtService.verifyRefreshToken(refreshToken);
    await this.blacklistToken(refreshToken);
    this.logger.log('User logged out successfully');
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.usersService.findOne(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.usersService.findOneWithPassword(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await this.passwordService.comparePassword(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    this.validatePassword(newPassword);

    await this.usersService.updatePassword(userId, newPassword);

    this.logger.log(`Password changed for user: ${userId}`);
  }

  private validatePassword(password: string): void {
    const passwordValidation = this.passwordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
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
