import { Role } from '@prisma/client';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
}

export interface CreateFaceRecordDto {
  userId?: string;
  faceId: string;
  imageData: string;
  faceData: string;
  confidence: number;
  options?: {
    name?: string;
    gender?: string;
    age?: number;
  };
}

export interface UpdateFaceRecordDto {
  faceId?: string;
  imageData?: string;
  faceData?: string;
  confidence?: number;
  isActive?: boolean;
}

export interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface FaceWebhookDto {
  eventType: string;
  faceId: string;
  confidence: number;
  timestamp: string;
  cameraId?: string;
  location?: string;
  imageData?: string;
  signature: string;
  metadata?: any;
}

export class DataFactory {
  private static counter = 0;

  /**
   * Generate a unique counter for test data
   */
  private static getCounter(): number {
    return ++DataFactory.counter;
  }

  /**
   * Generate a valid email address
   */
  static generateValidEmail(prefix = 'test'): string {
    const timestamp = Date.now();
    const counter = DataFactory.getCounter();
    return `${prefix}-${timestamp}-${counter}@example.com`;
  }

  /**
   * Generate a strong password
   */
  static generateStrongPassword(): string {
    const passwords = [
      'TestPassword123!',
      'SecurePass456@',
      'StrongPwd789#',
      'ValidPass012$',
      'TestAuth345%',
    ];
    return passwords[Math.floor(Math.random() * passwords.length)];
  }

  /**
   * Generate a weak password for validation testing
   */
  static generateWeakPassword(): string {
    const weakPasswords = ['123', 'password', 'abc', 'test', '12345'];
    return weakPasswords[Math.floor(Math.random() * weakPasswords.length)];
  }

  /**
   * Create user data with optional overrides
   */
  static createUserData(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
    const counter = DataFactory.getCounter();
    return {
      email: DataFactory.generateValidEmail(`user${counter}`),
      password: DataFactory.generateStrongPassword(),
      firstName: `TestUser${counter}`,
      lastName: 'Generated',
      role: Role.USER,
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Create admin user data
   */
  static createAdminUserData(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
    return DataFactory.createUserData({
      ...overrides,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    });
  }

  /**
   * Create moderator user data
   */
  static createModeratorUserData(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
    return DataFactory.createUserData({
      ...overrides,
      role: Role.MODERATOR,
      firstName: 'Moderator',
      lastName: 'User',
    });
  }

  /**
   * Create update user data
   */
  static createUpdateUserData(overrides: Partial<UpdateUserDto> = {}): UpdateUserDto {
    const counter = DataFactory.getCounter();
    return {
      firstName: `UpdatedUser${counter}`,
      lastName: 'Modified',
      ...overrides,
    };
  }

  /**
   * Create face record data
   */
  static createFaceRecordData(overrides: Partial<CreateFaceRecordDto> = {}): CreateFaceRecordDto {
    const counter = DataFactory.getCounter();
    return {
      faceId: `face-${Date.now()}-${counter}`,
      imageData: DataFactory.createBase64ImageData(),
      faceData: JSON.stringify({
        features: Array.from({ length: 128 }, () => Math.random()),
        landmarks: Array.from({ length: 68 }, () => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
        })),
      }),
      confidence: 0.95,
      options: {
        name: `TestFace${counter}`,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        age: Math.floor(Math.random() * 60) + 18,
      },
      ...overrides,
    };
  }

  /**
   * Create update face record data
   */
  static createUpdateFaceRecordData(
    overrides: Partial<UpdateFaceRecordDto> = {}
  ): UpdateFaceRecordDto {
    return {
      confidence: 0.98,
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Create base64 image data for testing
   */
  static createBase64ImageData(): string {
    // Small 1x1 pixel JPEG image in base64
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  }

  /**
   * Create mock file for upload testing
   */
  static createMockImageFile(overrides: Partial<MockFile> = {}): MockFile {
    const counter = DataFactory.getCounter();
    const imageBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      'base64'
    );

    return {
      fieldname: 'image',
      originalname: `test-image-${counter}.jpg`,
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: imageBuffer,
      size: imageBuffer.length,
      ...overrides,
    };
  }

  /**
   * Create mock file with invalid type
   */
  static createMockInvalidFile(): MockFile {
    const counter = DataFactory.getCounter();
    const textBuffer = Buffer.from('This is not an image file');

    return {
      fieldname: 'image',
      originalname: `invalid-file-${counter}.txt`,
      encoding: '7bit',
      mimetype: 'text/plain',
      buffer: textBuffer,
      size: textBuffer.length,
    };
  }

  /**
   * Create oversized mock file
   */
  static createOversizedMockFile(): MockFile {
    const counter = DataFactory.getCounter();
    // Create a 10MB buffer
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'a');

    return {
      fieldname: 'image',
      originalname: `large-file-${counter}.jpg`,
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: largeBuffer,
      size: largeBuffer.length,
    };
  }

  /**
   * Create webhook data
   */
  static createFaceWebhookData(overrides: Partial<FaceWebhookDto> = {}): FaceWebhookDto {
    const counter = DataFactory.getCounter();
    return {
      eventType: 'FACE_DETECTED',
      faceId: `webhook-face-${Date.now()}-${counter}`,
      confidence: 0.92,
      timestamp: new Date().toISOString(),
      cameraId: 'camera-1',
      location: 'Main Entrance',
      imageData: DataFactory.createBase64ImageData(),
      signature: 'test-signature-hash',
      metadata: {
        source: 'hikvision',
        deviceId: 'device-001',
        temperature: 36.5,
      },
      ...overrides,
    };
  }

  /**
   * Create login credentials
   */
  static createLoginCredentials(overrides: { email?: string; password?: string } = {}): {
    email: string;
    password: string;
  } {
    return {
      email: DataFactory.generateValidEmail('login'),
      password: DataFactory.generateStrongPassword(),
      ...overrides,
    };
  }

  /**
   * Create invalid login credentials
   */
  static createInvalidLoginCredentials(): {
    email: string;
    password: string;
  } {
    return {
      email: 'nonexistent@example.com',
      password: 'WrongPassword123!',
    };
  }

  /**
   * Create registration data
   */
  static createRegistrationData(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
    return DataFactory.createUserData(overrides);
  }

  /**
   * Create invalid registration data for validation testing
   */
  static createInvalidRegistrationData(): Partial<CreateUserDto> {
    return {
      email: 'invalid-email',
      password: '123', // Too short
      firstName: '', // Empty
      lastName: '', // Empty
    };
  }

  /**
   * Create password change data
   */
  static createPasswordChangeData(
    overrides: {
      currentPassword?: string;
      newPassword?: string;
    } = {}
  ): {
    currentPassword: string;
    newPassword: string;
  } {
    return {
      currentPassword: DataFactory.generateStrongPassword(),
      newPassword: DataFactory.generateStrongPassword(),
      ...overrides,
    };
  }

  /**
   * Create refresh token data
   */
  static createRefreshTokenData(refreshToken?: string): { refreshToken: string } {
    return {
      refreshToken: refreshToken || 'test-refresh-token',
    };
  }

  /**
   * Create pagination query parameters
   */
  static createPaginationQuery(
    overrides: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      isActive?: boolean;
    } = {}
  ): Record<string, string> {
    const query: Record<string, string> = {};

    if (overrides.page !== undefined) query.page = overrides.page.toString();
    if (overrides.limit !== undefined) query.limit = overrides.limit.toString();
    if (overrides.search !== undefined) query.search = overrides.search;
    if (overrides.role !== undefined) query.role = overrides.role;
    if (overrides.isActive !== undefined) query.isActive = overrides.isActive.toString();

    return query;
  }

  /**
   * Create face recognition query parameters
   */
  static createFaceRecognitionQuery(
    overrides: {
      page?: number;
      limit?: number;
      userId?: string;
      faceId?: string;
      faceRecordId?: string;
      eventType?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Record<string, string> {
    const query: Record<string, string> = {};

    if (overrides.page !== undefined) query.page = overrides.page.toString();
    if (overrides.limit !== undefined) query.limit = overrides.limit.toString();
    if (overrides.userId !== undefined) query.userId = overrides.userId;
    if (overrides.faceId !== undefined) query.faceId = overrides.faceId;
    if (overrides.faceRecordId !== undefined) query.faceRecordId = overrides.faceRecordId;
    if (overrides.eventType !== undefined) query.eventType = overrides.eventType;
    if (overrides.startDate !== undefined) query.startDate = overrides.startDate;
    if (overrides.endDate !== undefined) query.endDate = overrides.endDate;

    return query;
  }

  /**
   * Create multiple users data for bulk testing
   */
  static createMultipleUsersData(count: number, role?: Role): CreateUserDto[] {
    return Array.from({ length: count }, (_, index) =>
      DataFactory.createUserData({
        email: DataFactory.generateValidEmail(`bulk${index}`),
        firstName: `BulkUser${index}`,
        role: role || Role.USER,
      })
    );
  }

  /**
   * Create test data with relationships
   */
  static createRelatedTestData(): {
    userData: CreateUserDto;
    faceRecordData: CreateFaceRecordDto;
    webhookData: FaceWebhookDto;
  } {
    const counter = DataFactory.getCounter();
    const faceId = `related-face-${Date.now()}-${counter}`;

    return {
      userData: DataFactory.createUserData({
        email: DataFactory.generateValidEmail(`related${counter}`),
      }),
      faceRecordData: DataFactory.createFaceRecordData({
        faceId,
      }),
      webhookData: DataFactory.createFaceWebhookData({
        faceId,
      }),
    };
  }

  /**
   * Reset counter for testing
   */
  static resetCounter(): void {
    DataFactory.counter = 0;
  }
}
