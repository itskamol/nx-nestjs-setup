import { PrismaClient } from '@prisma/client';

export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private prisma: PrismaClient;
  private testDatabaseUrl: string;

  private constructor() {
    // Use the existing database for tests
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

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  async setupDatabase(): Promise<void> {
    try {
      // Set the test database URL in environment
      process.env['DATABASE_URL'] = this.testDatabaseUrl;

      // Connect to the database
      await this.prisma.$connect();

      console.log(` Test database connected: ${this.testDatabaseUrl}`);
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error);
      throw error;
    }
  }

  async cleanDatabase(): Promise<void> {
    try {
      // Clean all tables in reverse dependency order
      await this.prisma.$transaction([this.prisma.user.deleteMany()]);

      console.log('🧹 Test database cleaned');
    } catch (error) {
      console.error('❌ Failed to clean test database:', error);
      throw error;
    }
  }

  async teardownDatabase(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('🗑️ Test database disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect from test database:', error);
      // Don't throw here as it might be called in cleanup
    }
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  getDatabaseUrl(): string {
    return this.testDatabaseUrl;
  }
}
