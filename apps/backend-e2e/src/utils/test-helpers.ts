import { Response } from 'supertest';
import { EnhancedTestDatabaseManager } from './enhanced-test-database.setup';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class TestHelpers {
  private static dbManager = EnhancedTestDatabaseManager.getInstance();

  /**
   * Expect a successful API response with optional data validation
   */
  static expectSuccessResponse<T>(
    response: Response,
    expectedData?: Partial<T>,
    statusCode = 200
  ): void {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');

    if (expectedData) {
      Object.keys(expectedData).forEach(key => {
        expect(response.body.data).toHaveProperty(key, expectedData[key]);
      });
    }
  }

  /**
   * Expect an error response with specific error code and status
   */
  static expectErrorResponse(
    response: Response,
    expectedCode: string,
    expectedStatus: number,
    expectedMessage?: string
  ): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', expectedCode);

    if (expectedMessage) {
      expect(response.body.error).toHaveProperty('message', expectedMessage);
    }

    // Verify error response structure
    expect(response.body.error).toHaveProperty('timestamp');
    expect(response.body.error).toHaveProperty('path');
  }

  /**
   * Expect a paginated response with proper structure
   */
  static expectPaginatedResponse(
    response: Response,
    expectedLength?: number,
    statusCode = 200
  ): void {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');

    // Validate pagination structure
    const pagination = response.body.pagination;
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');

    // Validate pagination values
    expect(typeof pagination.page).toBe('number');
    expect(typeof pagination.limit).toBe('number');
    expect(typeof pagination.total).toBe('number');
    expect(typeof pagination.totalPages).toBe('number');

    // Validate data array
    expect(Array.isArray(response.body.data)).toBe(true);

    if (expectedLength !== undefined) {
      expect(response.body.data).toHaveLength(expectedLength);
    }
  }

  /**
   * Expect a validation error response
   */
  static expectValidationError(response: Response, field?: string, statusCode = 400): void {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');

    if (field) {
      expect(response.body.error).toHaveProperty('details');
      const details = response.body.error.details;

      if (Array.isArray(details)) {
        const fieldError = details.find((error: any) => error.field === field);
        expect(fieldError).toBeDefined();
      }
    }
  }

  /**
   * Expect unauthorized response (401)
   */
  static expectUnauthorizedResponse(response: Response): void {
    TestHelpers.expectErrorResponse(response, 'AUTHENTICATION_ERROR', 401);
  }

  /**
   * Expect forbidden response (403)
   */
  static expectForbiddenResponse(response: Response): void {
    TestHelpers.expectErrorResponse(response, 'AUTHORIZATION_ERROR', 403);
  }

  /**
   * Expect not found response (404)
   */
  static expectNotFoundResponse(response: Response): void {
    TestHelpers.expectErrorResponse(response, 'NOT_FOUND', 404);
  }

  /**
   * Expect conflict response (409)
   */
  static expectConflictResponse(response: Response): void {
    TestHelpers.expectErrorResponse(response, 'CONFLICT', 409);
  }

  /**
   * Validate user response structure
   */
  static expectUserResponse(response: Response, statusCode = 200): void {
    TestHelpers.expectSuccessResponse(response, undefined, statusCode);

    const user = response.body.data;
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('firstName');
    expect(user).toHaveProperty('lastName');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('isActive');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');

    // Ensure password is not included
    expect(user).not.toHaveProperty('password');
  }

  /**
   * Validate authentication response structure
   */
  static expectAuthResponse(response: Response, statusCode = 200): void {
    TestHelpers.expectSuccessResponse(response, undefined, statusCode);

    const data = response.body.data;
    expect(data).toHaveProperty('accessToken');
    expect(data).toHaveProperty('refreshToken');
    expect(data).toHaveProperty('user');

    // Validate user object in auth response
    const user = data.user;
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(user).not.toHaveProperty('password');
  }

  /**
   * Validate face record response structure
   */
  static expectFaceRecordResponse(response: Response, statusCode = 200): void {
    TestHelpers.expectSuccessResponse(response, undefined, statusCode);

    const record = response.body.data;
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('faceId');
    expect(record).toHaveProperty('imageData');
    expect(record).toHaveProperty('faceData');
    expect(record).toHaveProperty('confidence');
    expect(record).toHaveProperty('isActive');
    expect(record).toHaveProperty('createdAt');
    expect(record).toHaveProperty('updatedAt');
  }

  /**
   * Validate face recognition event response structure
   */
  static expectFaceEventResponse(response: Response, statusCode = 200): void {
    TestHelpers.expectSuccessResponse(response, undefined, statusCode);

    const event = response.body.data;
    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('eventType');
    expect(event).toHaveProperty('confidence');
    expect(event).toHaveProperty('timestamp');
  }

  /**
   * Validate response contains no sensitive data
   */
  static expectNoSensitiveData(response: Response): void {
    const responseStr = JSON.stringify(response.body);

    // Check for common sensitive fields
    expect(responseStr).not.toMatch(/password/i);
    expect(responseStr).not.toMatch(/secret/i);
    expect(responseStr).not.toMatch(/private/i);
    expect(responseStr).not.toMatch(/token.*:.*"[^"]*"/); // Avoid matching token field names
  }

  /**
   * Validate response time is within acceptable limits
   */
  static expectResponseTime(response: Response, maxTime = 5000): void {
    const responseTime = response.get('X-Response-Time') || '0ms';
    const timeInMs = parseInt(responseTime.replace('ms', ''));
    expect(timeInMs).toBeLessThan(maxTime);
  }

  /**
   * Validate CORS headers are present
   */
  static expectCorsHeaders(response: Response): void {
    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('access-control-allow-methods');
    expect(response.headers).toHaveProperty('access-control-allow-headers');
  }

  /**
   * Validate security headers are present
   */
  static expectSecurityHeaders(response: Response): void {
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers).toHaveProperty('x-xss-protection');
  }

  /**
   * Clean up all test data
   */
  static async cleanupTestData(): Promise<void> {
    await TestHelpers.dbManager.cleanupCreatedData();
  }

  /**
   * Wait for async operation with timeout
   */
  static async waitForAsyncOperation<T>(
    operation: () => Promise<T>,
    timeout = 10000,
    interval = 100
  ): Promise<T> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        return await operation();
      } catch (error: any) {
        if (Date.now() - startTime >= timeout) {
          throw new Error(`Operation timed out after ${timeout}ms: ${error.message}`);
        }
        await TestHelpers.sleep(interval);
      }
    }

    throw new Error(`Operation timed out after ${timeout}ms`);
  }

  /**
   * Sleep for specified milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random string for testing
   */
  static generateRandomString(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random number within range
   */
  static generateRandomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create test timeout wrapper
   */
  static withTimeout<T>(promise: Promise<T>, timeout = 30000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Validate array contains specific items
   */
  static expectArrayContains<T>(array: T[], expectedItems: Partial<T>[]): void {
    expect(Array.isArray(array)).toBe(true);

    expectedItems.forEach(expectedItem => {
      const found = array.some(item => {
        return Object.keys(expectedItem).every(key => item[key] === expectedItem[key]);
      });
      expect(found).toBe(true);
    });
  }

  /**
   * Validate object has required properties
   */
  static expectObjectHasProperties(obj: any, properties: string[]): void {
    properties.forEach(property => {
      expect(obj).toHaveProperty(property);
    });
  }

  /**
   * Validate object does not have forbidden properties
   */
  static expectObjectMissingProperties(obj: any, properties: string[]): void {
    properties.forEach(property => {
      expect(obj).not.toHaveProperty(property);
    });
  }

  /**
   * Validate date string format
   */
  static expectValidDateString(dateString: string): void {
    expect(typeof dateString).toBe('string');
    const date = new Date(dateString);
    expect(date.toString()).not.toBe('Invalid Date');
    expect(date.toISOString()).toBe(dateString);
  }

  /**
   * Validate UUID format
   */
  static expectValidUUID(uuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  }

  /**
   * Validate email format
   */
  static expectValidEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(email).toMatch(emailRegex);
  }

  /**
   * Create test database transaction
   */
  static async runInTransaction<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
    return TestHelpers.dbManager.runInTransaction(callback);
  }

  /**
   * Get database statistics for testing
   */
  static async getDatabaseStats(): Promise<{
    userCount: number;
    faceRecordCount: number;
    eventCount: number;
  }> {
    return {
      userCount: await TestHelpers.dbManager.getUserCount(),
      faceRecordCount: await TestHelpers.dbManager.getFaceRecordCount(),
      eventCount: await TestHelpers.dbManager.getFaceEventCount(),
    };
  }

  /**
   * Assert database state after operations
   */
  static async expectDatabaseState(expected: {
    userCount?: number;
    faceRecordCount?: number;
    eventCount?: number;
  }): Promise<void> {
    const stats = await TestHelpers.getDatabaseStats();

    if (expected.userCount !== undefined) {
      expect(stats.userCount).toBe(expected.userCount);
    }
    if (expected.faceRecordCount !== undefined) {
      expect(stats.faceRecordCount).toBe(expected.faceRecordCount);
    }
    if (expected.eventCount !== undefined) {
      expect(stats.eventCount).toBe(expected.eventCount);
    }
  }
}
