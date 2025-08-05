import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/config.service';
import { AuthResponse, JwtPayload } from '@shared/types';
import { User } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: AppConfigService
  ) {}

  /**
   * Generate access and refresh tokens for a user
   * @param user User object
   * @returns TokenPair with access and refresh tokens
   */
  async generateTokens(user: User): Promise<TokenPair> {
    try {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        // exp will be set automatically by JWT service based on expiresIn
      };

      const jwtConfig = this.configService.jwt;

      // Generate access token
      const accessToken = this.nestJwtService.sign(payload, {
        secret: jwtConfig.secret,
        expiresIn: jwtConfig.expiresIn,
      });

      // Generate refresh token with longer expiration
      const refreshToken = this.nestJwtService.sign(
        {
          sub: user.id,
          type: 'refresh',
          iat: Math.floor(Date.now() / 1000),
          jti: Math.random().toString(36).substring(2), // Add random component to ensure uniqueness
        },
        {
          secret: jwtConfig.refreshSecret,
          expiresIn: jwtConfig.refreshExpiresIn,
        }
      );

      this.logger.debug(`Generated tokens for user: ${user.email}`);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Failed to generate tokens', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode an access token
   * @param token JWT access token
   * @returns JwtPayload if valid
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.nestJwtService.verify<JwtPayload>(token, {
        secret: this.configService.jwt.secret,
      });

      // Validate payload structure
      if (!payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return payload;
    } catch (error) {
      this.logger.warn(
        `Access token verification failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Verify and decode a refresh token
   * @param token JWT refresh token
   * @returns Decoded payload if valid
   */
  async verifyRefreshToken(token: string): Promise<{ sub: string; type: string }> {
    try {
      const payload = this.nestJwtService.verify<{ sub: string; type: string }>(token, {
        secret: this.configService.jwt.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      return payload;
    } catch (error) {
      this.logger.warn(
        `Refresh token verification failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader Authorization header value
   * @returns Token string without 'Bearer ' prefix
   */
  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    return token;
  }

  /**
   * Decode token without verification (for debugging/logging)
   * @param token JWT token
   * @returns Decoded payload or null
   */
  decodeToken(token: string): any {
    try {
      return this.nestJwtService.decode(token);
    } catch (error) {
      this.logger.warn('Failed to decode token', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param token JWT token
   * @returns boolean indicating if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param token JWT token
   * @returns Date object or null
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Create authentication response object
   * @param user User object
   * @param tokens Token pair
   * @returns AuthResponse object
   */
  createAuthResponse(user: User, tokens: TokenPair): AuthResponse {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
