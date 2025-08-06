import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { EnhancedTestDatabaseManager, TestUser } from './enhanced-test-database.setup';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp?: number;
}

export class AuthUtils {
  private jwtService: JwtService;
  private dbManager: EnhancedTestDatabaseManager;

  constructor() {
    // Initialize JWT service with test configuration
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      },
    });
    this.dbManager = EnhancedTestDatabaseManager.getInstance();
  }

  /**
   * Create a test user with specified role
   */
  async createTestUser(
    role: Role = Role.USER,
    userData: Partial<TestUser> = {}
  ): Promise<TestUser> {
    return this.dbManager.createTestUser({ ...userData, role });
  }

  /**
   * Create an admin user for testing
   */
  async createAdminUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.dbManager.createAdminUser(userData);
  }

  /**
   * Create a moderator user for testing
   */
  async createModeratorUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.dbManager.createModeratorUser(userData);
  }

  /**
   * Create a regular user for testing
   */
  async createRegularUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.dbManager.createRegularUser(userData);
  }

  /**
   * Generate JWT tokens for a test user
   */
  async generateTokensForUser(user: TestUser): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Login as a specific user and return tokens
   */
  async loginAs(user: TestUser): Promise<AuthTokens> {
    return this.generateTokensForUser(user);
  }

  /**
   * Login as admin and return tokens
   */
  async loginAsAdmin(
    userData: Partial<TestUser> = {}
  ): Promise<{ user: TestUser; tokens: AuthTokens }> {
    const user = await this.createAdminUser(userData);
    const tokens = await this.loginAs(user);
    return { user, tokens };
  }

  /**
   * Login as moderator and return tokens
   */
  async loginAsModerator(
    userData: Partial<TestUser> = {}
  ): Promise<{ user: TestUser; tokens: AuthTokens }> {
    const user = await this.createModeratorUser(userData);
    const tokens = await this.loginAs(user);
    return { user, tokens };
  }

  /**
   * Login as regular user and return tokens
   */
  async loginAsUser(
    userData: Partial<TestUser> = {}
  ): Promise<{ user: TestUser; tokens: AuthTokens }> {
    const user = await this.createRegularUser(userData);
    const tokens = await this.loginAs(user);
    return { user, tokens };
  }

  /**
   * Get authentication headers for HTTP requests
   */
  getAuthHeaders(tokens: AuthTokens): Record<string, string> {
    return {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authentication headers with Bearer token only
   */
  getBearerHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  /**
   * Generate an invalid JWT token for testing
   */
  generateInvalidToken(): string {
    return 'invalid.jwt.token';
  }

  /**
   * Generate an expired JWT token for testing
   */
  generateExpiredToken(user: TestUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    };

    return this.jwtService.sign(payload, { expiresIn: '-1h' });
  }

  /**
   * Generate a token with invalid signature for testing
   */
  generateTokenWithInvalidSignature(user: TestUser): string {
    const invalidJwtService = new JwtService({
      secret: 'different-secret-key',
      signOptions: { expiresIn: '1h' },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    return invalidJwtService.sign(payload);
  }

  /**
   * Decode JWT token without verification (for testing)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verify(token);
  }

  /**
   * Create multiple users with different roles for testing
   */
  async createUsersWithRoles(): Promise<{
    admin: TestUser;
    moderator: TestUser;
    user: TestUser;
  }> {
    const [admin, moderator, user] = await Promise.all([
      this.createAdminUser({ email: 'admin@test.com', firstName: 'Admin', lastName: 'User' }),
      this.createModeratorUser({
        email: 'moderator@test.com',
        firstName: 'Moderator',
        lastName: 'User',
      }),
      this.createRegularUser({ email: 'user@test.com', firstName: 'Regular', lastName: 'User' }),
    ]);

    return { admin, moderator, user };
  }

  /**
   * Create authenticated headers for different roles
   */
  async createAuthHeadersForRoles(): Promise<{
    adminHeaders: Record<string, string>;
    moderatorHeaders: Record<string, string>;
    userHeaders: Record<string, string>;
  }> {
    const users = await this.createUsersWithRoles();

    const [adminTokens, moderatorTokens, userTokens] = await Promise.all([
      this.loginAs(users.admin),
      this.loginAs(users.moderator),
      this.loginAs(users.user),
    ]);

    return {
      adminHeaders: this.getAuthHeaders(adminTokens),
      moderatorHeaders: this.getAuthHeaders(moderatorTokens),
      userHeaders: this.getAuthHeaders(userTokens),
    };
  }

  /**
   * Create test scenario with user and tokens
   */
  async createTestScenario(
    role: Role = Role.USER,
    userData: Partial<TestUser> = {}
  ): Promise<{
    user: TestUser;
    tokens: AuthTokens;
    headers: Record<string, string>;
  }> {
    const user = await this.createTestUser(role, userData);
    const tokens = await this.loginAs(user);
    const headers = this.getAuthHeaders(tokens);

    return { user, tokens, headers };
  }

  /**
   * Clean up authentication-related test data
   */
  async cleanup(): Promise<void> {
    await this.dbManager.cleanupCreatedData();
  }

  /**
   * Generate refresh token for testing
   */
  generateRefreshToken(user: TestUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
  }

  /**
   * Generate tokens with custom expiration for testing
   */
  generateTokensWithExpiration(
    user: TestUser,
    accessExpiry: string,
    refreshExpiry: string
  ): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: accessExpiry });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: refreshExpiry });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }
}
