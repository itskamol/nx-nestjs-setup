# Testing Documentation

This document provides an overview of the testing setup and practices used in the Staff Management System.

## Test Structure

The project uses a comprehensive testing structure organized as follows:

```
__tests__/
├── components/          # Component tests
│   └── AuthForm.test.tsx
├── hooks/              # Hook tests
│   ├── useForm.test.ts
│   ├── useField.test.ts
│   └── specializedFieldHooks.test.ts
├── pages/              # Page tests
│   └── FaceEnrollmentPage.test.tsx
├── schemas/            # Schema validation tests
│   └── schemas.test.ts
└── utils/              # Utility function tests
    ├── FormSchemaBuilder.test.ts
    └── FormValidationUtils.test.ts
```

## Testing Tools

### Core Dependencies
- **Jest**: Test runner and assertion library
- **React Testing Library**: Testing utilities for React components
- **Testing Library Jest DOM**: Custom Jest matchers for DOM elements
- **TypeScript**: Type checking for tests

### Mocking Libraries
- **Jest Mock**: Built-in mocking functionality
- **Manual Mocks**: Custom mocks for external dependencies

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/__tests__/**/*.{ts,tsx}',
    '<rootDir>/**/*.{test,spec}.{ts,tsx}'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'types/**/*.{ts}',
    '!**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
}
```

### Setup File (`jest.setup.js`)
The setup file includes:
- Mock implementations for Next.js router
- Mock implementations for next-themes
- Browser API mocks (matchMedia, IntersectionObserver, ResizeObserver)
- File API mocks (FileReader, URL.createObjectURL)
- Media device mocks for camera functionality

## Test Scripts

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

## Testing Patterns

### Component Testing
Components are tested using React Testing Library with a focus on:
- User interaction testing
- Accessibility testing
- State management
- Props validation
- Error handling

Example:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthForm } from '@/components/ui/organisms/AuthForm/AuthForm'

describe('AuthForm', () => {
  it('renders login form correctly', () => {
    render(<AuthForm type="login" onSubmit={mockOnSubmit} />)
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
  })

  it('calls onSubmit when form is submitted', () => {
    render(<AuthForm type="login" onSubmit={mockOnSubmit} />)
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    fireEvent.click(submitButton)
    expect(mockOnSubmit).toHaveBeenCalled()
  })
})
```

### Hook Testing
Custom hooks are tested using `renderHook` from React Testing Library:
- State changes
- Function calls
- Error handling
- Return values

Example:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useForm } from '@/hooks/useForm'

describe('useForm hook', () => {
  it('initializes form with default values', () => {
    const { result } = renderHook(() => useForm({
      schema: testSchema,
      defaultValues
    }))
    expect(result.current).toBeDefined()
  })
})
```

### Schema Testing
Zod schemas are tested for:
- Valid data acceptance
- Invalid data rejection
- Custom validation rules
- Error message accuracy

Example:
```typescript
import { loginSchema } from '@/types/schemas'

describe('loginSchema', () => {
  it('validates correct login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123'
    }
    const result = loginSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})
```

### Utility Testing
Utility functions are tested for:
- Input/output behavior
- Edge cases
- Error handling
- Performance considerations

Example:
```typescript
import { FormValidationUtils } from '@/utils/formValidation'

describe('FormValidationUtils', () => {
  it('formats file size correctly', () => {
    expect(FormValidationUtils.formatFileSize(1024)).toBe('1 KB')
    expect(FormValidationUtils.formatFileSize(1048576)).toBe('1 MB')
  })
})
```

## Mocking Strategy

### External Dependencies
- **Next.js**: Router, Image, Link components
- **UI Components**: Custom shadcn/ui components
- **Form Libraries**: react-hook-form, zod
- **Browser APIs**: Media devices, file handling
- **Third-party Libraries**: toast notifications, theming

### Mock Patterns
1. **Complete Mock**: Replace entire module with mock implementation
2. **Partial Mock**: Mock specific functions while keeping others real
3. **Spy Mock**: Keep original implementation but track calls
4. **Manual Mock**: Create custom mock implementations in `__mocks__` directory

## Coverage Goals

The test suite aims for:
- **Components**: 90%+ coverage
- **Hooks**: 95%+ coverage
- **Utilities**: 95%+ coverage
- **Schemas**: 100% coverage
- **Pages**: 80%+ coverage

## Best Practices

### Writing Tests
1. **Test user behavior, not implementation**
2. **Use semantic queries** (getByRole, getByLabelText)
3. **Test accessibility** alongside functionality
4. **Mock external dependencies** appropriately
5. **Test error cases** as well as success cases
6. **Keep tests simple and focused**

### Test Organization
1. **Group related tests** in describe blocks
2. **Use clear test names** that describe behavior
3. **Arrange-Act-Assert pattern** for test structure
4. **Setup and cleanup** in beforeEach/afterEach
5. **Share common setup** with helper functions

### Performance Considerations
1. **Mock expensive operations** (API calls, file operations)
2. **Use jest.mock** for consistent mocking
3. **Clean up mocks** between tests
4. **Avoid unnecessary re-renders** in component tests

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- AuthForm.test.tsx
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="renders.*correctly"
```

## Debugging Tests

### Debug Mode
Add `.only` to a specific test or describe block:
```typescript
it.only('should work', () => {
  // This test will run exclusively
})
```

### Console Output
Use `console.log` for debugging (will be shown in test output):
```typescript
it('should debug', () => {
  console.log('Debug info:', someVariable)
})
```

### Test Breakpoints
Add `debugger` statement to pause test execution:
```typescript
it('should pause', () => {
  debugger
  // Test will pause here in Node.js debugger
})
```

## Continuous Integration

The test suite is designed to run in CI/CD environments:
- **Fast execution**: Minimal setup and teardown
- **Deterministic**: No external dependencies
- **Isolated**: Tests don't affect each other
- **Comprehensive**: Covers critical functionality

## Future Enhancements

### Planned Improvements
1. **Integration Tests**: API integration testing
2. **E2E Tests**: Full user journey testing
3. **Visual Testing**: Screenshot comparison testing
4. **Performance Tests**: Component performance benchmarking
5. **Accessibility Tests**: Automated accessibility checking

### Additional Tools
1. **Cypress**: End-to-end testing
2. **Playwright**: Cross-browser testing
3. **Testing Library Cypress**: E2E testing utilities
4. **Storybook**: Component testing and documentation
5. **MSW**: API mocking for integration tests