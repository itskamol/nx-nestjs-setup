# Design Document

## Overview

This design outlines a comprehensive end-to-end testing system for all API endpoints in the NestJS backend application. The testing framework will validate functionality, security, error handling, and response formats across Auth, Users, and Face Recognition modules. The design leverages the existing Jest and Supertest infrastructure while adding specialized utilities for role-based testing and data management.

## Architecture

### Test Structure Organization

```
apps/backend-e2e/src/
├── auth/
│   ├── auth-endpoints.e2e-spec.ts
│   └── auth-security.e2e-spec.ts
├── users/
│   ├── users-crud.e2e-spec.ts
│   ├── users-authorization.e2e-spec.ts
│   └── users-profile.e2e-spec.ts
├── face-recognition/
│   ├── face-recognition-core.e2e-spec.ts
│   ├── face-recognition-admin.e2e-spec.ts
│   └── face-recognition-webhook.e2e-spec.ts
├── utils/
│   ├── test-helpers.ts
│   ├── auth-utils.ts
│   ├── data-factory.ts
│   └── mock-services.ts
└── support/
    ├── test-database.setup.ts (enhanced)
    └── test-app.setup.ts (new)
```

### Test Categories

1. **Functional Tests**: Verify endpoint functionality with valid inputs
2. **Security Tests**: Validate authentication and authorization
3. **Validation Tests**: Test input validation and error responses
4. **Integration Tests**: Test endpoint interactions and data flow
5. **Performance Tests**: Basic response time validation

## Components and Interfaces

### Test Utilities

#### AuthUtils Interface
```typescript
interface AuthUtils {
  createTestUser(role: Role, userData?: Partial<CreateUserDto>): Promise<TestUser>;
  loginAs(user: TestUser): Promise<AuthTokens>;
  getAuthHeaders(tokens: AuthTokens): Record<string, string>;
  createAdminUser(): Promise<TestUser>;
  createModeratorUser(): Promise<TestUser>;
  createRegularUser(): Promise<TestUser>;
}
```

#### DataFactory Interface
```typescript
interface DataFactory {
  createUserData(overrides?: Partial<CreateUserDto>): CreateUserDto;
  createFaceRecordData(overrides?: Partial<CreateFaceRecordDto>): CreateFaceRecordDto;
  createMockImageFile(): MockFile;
  createBase64ImageData(): string;
  generateValidEmail(): string;
  generateStrongPassword(): string;
}
```

#### TestHelpers Interface
```typescript
interface TestHelpers {
  expectSuccessResponse<T>(response: any, expectedData?: Partial<T>): void;
  expectErrorResponse(response: any, expectedCode: string, expectedStatus: number): void;
  expectPaginatedResponse<T>(response: any, expectedLength?: number): void;
  expectValidationError(response: any, field: string): void;
  cleanupTestData(): Promise<void>;
  waitForAsyncOperation(operation: () => Promise<any>, timeout?: number): Promise<any>;
}
```

### Test Data Models

#### TestUser Interface
```typescript
interface TestUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
}
```

#### AuthTokens Interface
```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### MockFile Interface
```typescript
interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}
```

## Data Models

### Test Database Schema Extensions

The existing Prisma schema will be used with additional test data seeding utilities:

```typescript
interface TestDataSeeder {
  seedUsers(count: number, role?: Role): Promise<TestUser[]>;
  seedFaceRecords(userId: string, count: number): Promise<FaceRecord[]>;
  seedFaceEvents(faceRecordId: string, count: number): Promise<FaceEvent[]>;
  cleanAllTestData(): Promise<void>;
}
```

### Test Configuration

```typescript
interface TestConfig {
  database: {
    url: string;
    cleanupAfterEach: boolean;
    seedData: boolean;
  };
  auth: {
    jwtSecret: string;
    tokenExpiration: string;
    refreshTokenExpiration: string;
  };
  files: {
    maxSize: number;
    allowedMimeTypes: string[];
    uploadPath: string;
  };
  external: {
    hikvisionMockEnabled: boolean;
    webhookSecret: string;
  };
}
```

## Error Handling

### Test Error Categories

1. **Authentication Errors**: 401 Unauthorized responses
2. **Authorization Errors**: 403 Forbidden responses  
3. **Validation Errors**: 400 Bad Request with validation details
4. **Not Found Errors**: 404 Not Found responses
5. **Conflict Errors**: 409 Conflict responses
6. **Server Errors**: 500 Internal Server Error responses

### Error Response Validation

```typescript
interface ErrorTestCase {
  description: string;
  request: {
    method: string;
    endpoint: string;
    body?: any;
    headers?: Record<string, string>;
  };
  expectedResponse: {
    status: number;
    errorCode: string;
    message?: string;
    validationFields?: string[];
  };
}
```

## Testing Strategy

### Test Execution Flow

1. **Setup Phase**:
   - Initialize test database
   - Create test application instance
   - Seed required test data
   - Setup mock services

2. **Test Phase**:
   - Execute endpoint tests in isolation
   - Validate responses and side effects
   - Test error scenarios
   - Verify security constraints

3. **Cleanup Phase**:
   - Clean test data
   - Reset mock services
   - Close database connections

### Role-Based Testing Strategy

```typescript
interface RoleTestScenario {
  role: Role;
  allowedEndpoints: string[];
  forbiddenEndpoints: string[];
  testCases: TestCase[];
}
```

### Test Data Management

1. **Isolation**: Each test creates its own data
2. **Cleanup**: Automatic cleanup after each test
3. **Factories**: Consistent test data generation
4. **Seeding**: Pre-populated data for complex scenarios

### Mock Services Strategy

1. **Hikvision Service**: Mock external device interactions
2. **File Upload**: Mock file processing
3. **Email Service**: Mock notification sending
4. **Cache Service**: Mock Redis operations

### Performance Testing

```typescript
interface PerformanceTest {
  endpoint: string;
  method: string;
  maxResponseTime: number;
  concurrentRequests?: number;
  expectedThroughput?: number;
}
```

### Security Testing

1. **JWT Token Validation**: Test token expiration, invalid tokens
2. **Role-Based Access**: Verify endpoint access by role
3. **Input Sanitization**: Test SQL injection, XSS prevention
4. **Rate Limiting**: Test throttling mechanisms
5. **CORS**: Validate cross-origin request handling

### Integration Testing

1. **Auth Flow**: Registration → Login → Protected Endpoints
2. **User Management**: Create → Read → Update → Delete
3. **Face Recognition**: Enroll → Recognize → Events → Cleanup
4. **Webhook Processing**: External Event → Processing → Storage

### Test Reporting

```typescript
interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  coverage: {
    endpoints: number;
    statusCodes: number;
    errorScenarios: number;
  };
  performance: {
    averageResponseTime: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
  };
}
```

## Implementation Considerations

### Database Management
- Use transactions for test isolation
- Implement efficient cleanup strategies
- Handle concurrent test execution
- Manage test data lifecycle

### Authentication Testing
- Generate valid JWT tokens for testing
- Test token expiration scenarios
- Validate refresh token flow
- Test role-based access control

### File Upload Testing
- Create mock file data
- Test file validation
- Test file size limits
- Test unsupported file types

### External Service Mocking
- Mock Hikvision device responses
- Mock webhook signatures
- Mock network failures
- Mock timeout scenarios

### Test Performance
- Optimize test execution time
- Parallel test execution where possible
- Efficient database operations
- Minimal test data creation

### Maintenance
- Easy test case addition
- Clear test organization
- Comprehensive documentation
- Automated test discovery