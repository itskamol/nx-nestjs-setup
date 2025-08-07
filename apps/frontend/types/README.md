# TypeScript Types Documentation

This document provides an overview of the comprehensive TypeScript type system implemented for the Staff Management System.

## Overview

The type system is organized into several modules, each serving a specific purpose:

- **`api.ts`** - API request/response types and authentication types
- **`forms.ts`** - Form validation and state management types
- **`websocket.ts`** - Real-time communication types
- **`hooks.ts`** - Custom React hook types
- **`utils.ts`** - Utility types for common operations
- **`index.ts`** - Main export file with convenience re-exports

## Key Features

### 1. **Type Safety**
- Comprehensive API response types with proper error handling
- Strong typing for all form operations
- WebSocket message types for real-time features
- Generic types for reusable components

### 2. **Extensibility**
- Modular type system that's easy to extend
- Generic interfaces for common patterns
- Utility types for complex transformations
- Proper separation of concerns

### 3. **Developer Experience**
- Intellisense-friendly type definitions
- Clear error messages with validation
- Comprehensive documentation
- Easy-to-use type exports

## Type Structure

### API Types (`api.ts`)

```typescript
// Core API types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// User management types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  // ... other properties
}

// Face recognition types
interface FaceRecord {
  id: string;
  userId?: string;
  faceId: string;
  confidence: number;
  // ... other properties
}
```

### Form Types (`forms.ts`)

```typescript
// Form state management
interface FormField<T> {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
  dirty?: boolean;
}

// Form validation
interface ValidationRule<T> {
  required?: boolean;
  minLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
}
```

### WebSocket Types (`websocket.ts`)

```typescript
// Real-time communication
interface WebSocketMessage<T> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
  messageId: string;
}

// Message types enum
enum WebSocketMessageType {
  FACE_RECOGNITION = 'face_recognition',
  USER_UPDATE = 'user_update',
  SYSTEM_EVENT = 'system_event',
}
```

### Hook Types (`hooks.ts`)

```typescript
// API hook types
interface UseApiOptions<T> {
  enabled?: boolean;
  retry?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

// Form hook types
interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  onSubmit?: (values: T) => Promise<void>;
}
```

### Utility Types (`utils.ts`)

```typescript
// Common utility types
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
type Result<T, E> = { success: true; data: T } | { success: false; error: E };
```

## Usage Examples

### API Usage

```typescript
import { User, CreateUserRequest, ApiResponse } from '@/types';

const createUser = async (userData: CreateUserRequest): Promise<ApiResponse<User>> => {
  const response = await api.post<ApiResponse<User>>('/users', userData);
  return response.data;
};
```

### Form Usage

```typescript
import { FormState, ValidationRule } from '@/types';

interface LoginForm {
  email: string;
  password: string;
}

const validationRules: Record<keyof LoginForm, ValidationRule> = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email'
  },
  password: {
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters'
  }
};
```

### WebSocket Usage

```typescript
import { WebSocketMessage, WebSocketMessageType } from '@/types';

const handleMessage = (message: WebSocketMessage<unknown>) => {
  switch (message.type) {
    case WebSocketMessageType.FACE_RECOGNITION:
      // Handle face recognition event
      break;
    case WebSocketMessageType.USER_UPDATE:
      // Handle user update
      break;
  }
};
```

### Hook Usage

```typescript
import { UseApiOptions, UseFormOptions } from '@/types';

const apiOptions: UseApiOptions<User[]> = {
  enabled: true,
  retry: 3,
  onSuccess: (data) => console.log('Users loaded:', data)
};

const formOptions: UseFormOptions<LoginForm> = {
  initialValues: { email: '', password: '' },
  onSubmit: async (values) => {
    await login(values);
  }
};
```

## Best Practices

### 1. **Type Safety**
- Avoid using `any` type - use proper interfaces
- Use generic types for reusable components
- Implement proper error handling types

### 2. **Modularity**
- Keep related types together in modules
- Use proper export/import patterns
- Document complex types with JSDoc

### 3. **Consistency**
- Follow naming conventions (PascalCase for types, camelCase for properties)
- Use consistent property names across types
- Maintain proper type relationships

### 4. **Performance**
- Use interface instead of type for object shapes when possible
- Prefer readonly properties for immutable data
- Use utility types for common transformations

## Type Testing

The type system includes comprehensive tests to ensure:

- Type compatibility between modules
- Proper error handling scenarios
- Generic type constraints
- Utility type functionality

## Migration Guide

### From `any` to Proper Types

**Before:**
```typescript
const userData: any = await api.getUser(id);
```

**After:**
```typescript
const userData: User = await api.getUser(id);
```

### From Inline Types to Proper Interfaces

**Before:**
```typescript
interface LocalUser {
  id: string;
  name: string;
}
```

**After:**
```typescript
import { User } from '@/types';
```

## Contributing

When adding new types:

1. **Place in appropriate module** (api.ts, forms.ts, etc.)
2. **Follow naming conventions**
3. **Add proper documentation**
4. **Update index.ts exports**
5. **Add type tests if needed**

## Version History

- **v1.0.0** - Initial comprehensive type system
  - API types with proper error handling
  - Form validation types
  - WebSocket communication types
  - Hook types for React
  - Utility types for common operations

## Future Enhancements

- [ ] Runtime type validation with Zod
- [ ] GraphQL schema types
- [ ] Database model types
- [ ] Event sourcing types
- [ ] Advanced utility types
- [ ] Type testing framework integration