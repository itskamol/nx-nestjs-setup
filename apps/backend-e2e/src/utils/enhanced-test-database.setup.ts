import { FaceEventType, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
}

export interface TestFaceRecord {
  id: string;
  userId?: string;
  faceId: string;
  imageData: string;
  faceData: string;
  confidence: number;
  isActive: boolean;
}

export interface TestFaceEvent {
  id: string;
  faceRecordId?: string;
  faceId?: string;
  eventType: FaceEventType;
  confidence: number;
  timestamp: Date;
  cameraId?: string;
  location?: string;
  imageData?: string;
  metadata?: any;
}

export class EnhancedTestDatabaseManager {
  private static instance: EnhancedTestDatabaseManager;
  private prisma: PrismaClient;
  private testDatabaseUrl: string;
  private createdUsers: string[] = [];
  private createdFaceRecords: string[] = [];
  private createdEvents: string[] = [];

  private constructor() {
    this.testDatabaseUrl =
      process.env['DATABASE_URL'] ||
      'postgresql://postgres:12345@localhost:5432/testdb?schema=public';

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.testDatabaseUrl,
        },
      },
    });
  }

  static getInstance(): EnhancedTestDatabaseManager {
    if (!EnhancedTestDatabaseManager.instance) {
      EnhancedTestDatabaseManager.instance = new EnhancedTestDatabaseManager();
    }
    return EnhancedTestDatabaseManager.instance;
  }

  async setupDatabase(): Promise<void> {
    try {
      process.env['DATABASE_URL'] = this.testDatabaseUrl;
      await this.prisma.$connect();
      console.log(` Enhanced test database connected: ${this.testDatabaseUrl}`);
    } catch (error) {
      console.error('❌ Failed to connect to enhanced test database:', error);
      throw error;
    }
  }

  async cleanDatabase(): Promise<void> {
    try {
      // Clean in reverse dependency order
      await this.prisma.$transaction([
        this.prisma.faceRecognitionEvent.deleteMany(),
        this.prisma.faceRecord.deleteMany(),
        this.prisma.user.deleteMany(),
      ]);

      // Clear tracking arrays
      this.createdUsers = [];
      this.createdFaceRecords = [];
      this.createdEvents = [];

      console.log('🧹 Enhanced test database cleaned');
    } catch (error) {
      console.error('❌ Failed to clean enhanced test database:', error);
      throw error;
    }
  }

  async cleanupCreatedData(): Promise<void> {
    try {
      // Clean only data created during current test session
      if (this.createdEvents.length > 0) {
        await this.prisma.faceRecognitionEvent.deleteMany({
          where: { id: { in: this.createdEvents } },
        });
      }

      if (this.createdFaceRecords.length > 0) {
        await this.prisma.faceRecord.deleteMany({
          where: { id: { in: this.createdFaceRecords } },
        });
      }

      if (this.createdUsers.length > 0) {
        await this.prisma.user.deleteMany({
          where: { id: { in: this.createdUsers } },
        });
      }

      // Clear tracking arrays
      this.createdUsers = [];
      this.createdFaceRecords = [];
      this.createdEvents = [];

      console.log('🧹 Created test data cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup created test data:', error);
      throw error;
    }
  }

  async teardownDatabase(): Promise<void> {
    try {
      await this.cleanupCreatedData();
      await this.prisma.$disconnect();
      console.log('🗑️ Enhanced test database disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect from enhanced test database:', error);
    }
  }

  // User creation utilities
  async createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const defaultUser = {
      email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: Role.USER,
      isActive: true,
    };

    const userToCreate = { ...defaultUser, ...userData };
    const hashedPassword = await bcrypt.hash(userToCreate.password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        email: userToCreate.email,
        password: hashedPassword,
        firstName: userToCreate.firstName,
        lastName: userToCreate.lastName,
        role: userToCreate.role,
        isActive: userToCreate.isActive,
      },
    });

    this.createdUsers.push(createdUser.id);

    return {
      ...createdUser,
      password: userToCreate.password, // Return original password for testing
    };
  }

  async createAdminUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.createTestUser({ ...userData, role: Role.ADMIN });
  }

  async createModeratorUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.createTestUser({ ...userData, role: Role.MODERATOR });
  }

  async createRegularUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.createTestUser({ ...userData, role: Role.USER });
  }

  async seedUsers(count: number, role?: Role): Promise<TestUser[]> {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        email: `seed-user-${i}-${Date.now()}@example.com`,
        firstName: `User${i}`,
        lastName: `Test`,
        role: role || Role.USER,
      });
      users.push(user);
    }
    return users;
  }

  // Face record utilities
  async createTestFaceRecord(
    userId?: string,
    faceRecordData: Partial<TestFaceRecord> = {}
  ): Promise<TestFaceRecord> {
    const defaultFaceRecord = {
      faceId: `face-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageData:
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      faceData: JSON.stringify({ features: [0.1, 0.2, 0.3, 0.4, 0.5] }),
      confidence: 0.95,
      isActive: true,
    };

    const recordToCreate = { ...defaultFaceRecord, ...faceRecordData };

    const createdRecord = await this.prisma.faceRecord.create({
      data: {
        userId,
        faceId: recordToCreate.faceId,
        imageData: recordToCreate.imageData,
        faceData: recordToCreate.faceData,
        confidence: recordToCreate.confidence,
        isActive: recordToCreate.isActive,
      },
    });

    this.createdFaceRecords.push(createdRecord.id);
    return createdRecord;
  }

  async seedFaceRecords(userId: string, count: number): Promise<TestFaceRecord[]> {
    const records: TestFaceRecord[] = [];
    for (let i = 0; i < count; i++) {
      const record = await this.createTestFaceRecord(userId, {
        faceId: `seed-face-${userId}-${i}-${Date.now()}`,
      });
      records.push(record);
    }
    return records;
  }

  // Face event utilities
  async createTestFaceEvent(
    faceRecordId?: string,
    eventData: Partial<TestFaceEvent> = {}
  ): Promise<TestFaceEvent> {
    const defaultEvent = {
      faceId: `event-face-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: FaceEventType.DETECTED,
      confidence: 0.85,
      timestamp: new Date(),
      cameraId: 'camera-1',
      location: 'Main Entrance',
      imageData:
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      metadata: { source: 'test' },
    };

    const eventToCreate = { ...defaultEvent, ...eventData };

    const createdEvent = await this.prisma.faceRecognitionEvent.create({
      data: {
        faceRecordId,
        faceId: eventToCreate.faceId,
        eventType: eventToCreate.eventType,
        confidence: eventToCreate.confidence,
        timestamp: eventToCreate.timestamp,
        cameraId: eventToCreate.cameraId,
        location: eventToCreate.location,
        imageData: eventToCreate.imageData,
        metadata: eventToCreate.metadata,
      },
    });

    this.createdEvents.push(createdEvent.id);
    return createdEvent;
  }

  async seedFaceEvents(faceRecordId: string, count: number): Promise<TestFaceEvent[]> {
    const events: TestFaceEvent[] = [];
    for (let i = 0; i < count; i++) {
      const event = await this.createTestFaceEvent(faceRecordId, {
        eventType: i % 2 === 0 ? FaceEventType.DETECTED : FaceEventType.RECOGNIZED,
        timestamp: new Date(Date.now() - i * 60000), // Events 1 minute apart
      });
      events.push(event);
    }
    return events;
  }

  // Transaction utilities
  async runInTransaction<T>(
    callback: (
      prisma: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
      >
    ) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  // Utility methods
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  getDatabaseUrl(): string {
    return this.testDatabaseUrl;
  }

  getCreatedUserIds(): string[] {
    return [...this.createdUsers];
  }

  getCreatedFaceRecordIds(): string[] {
    return [...this.createdFaceRecords];
  }

  getCreatedEventIds(): string[] {
    return [...this.createdEvents];
  }

  // Database state utilities
  async getUserCount(): Promise<number> {
    return this.prisma.user.count();
  }

  async getFaceRecordCount(): Promise<number> {
    return this.prisma.faceRecord.count();
  }

  async getFaceEventCount(): Promise<number> {
    return this.prisma.faceRecognitionEvent.count();
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findFaceRecordByFaceId(faceId: string) {
    return this.prisma.faceRecord.findUnique({ where: { faceId } });
  }
}
