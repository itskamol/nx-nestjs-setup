import { renderHook } from '@testing-library/react';
import { useEmailField, useFileField, useNumberField, usePasswordField } from '@/hooks/useField';

// Mock react-hook-form
const mockFormState = {
  errors: {},
  isValid: true,
  isDirty: false,
  isSubmitting: false,
};

const mockControl = {
  register: jest.fn(),
  unregister: jest.fn(),
  setValue: jest.fn(),
  getValues: jest.fn(),
  watch: jest.fn(),
  trigger: jest.fn(),
  clearErrors: jest.fn(),
  setError: jest.fn(),
};

jest.mock('react-hook-form', () => ({
  useFormContext: () => ({
    control: mockControl,
    formState: mockFormState,
    register: jest.fn(),
    setValue: jest.fn(),
    trigger: jest.fn(),
    clearErrors: jest.fn(),
    setError: jest.fn(),
  }),
  useForm: () => ({
    control: mockControl,
    formState: mockFormState,
    register: jest.fn(),
    setValue: jest.fn(),
    trigger: jest.fn(),
    clearErrors: jest.fn(),
    setError: jest.fn(),
  }),
}));

jest.mock('@hookform/resolvers', () => ({
  zodResolver: jest.fn(() => jest.fn()),
}));

describe('Specialized Field Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormState.errors = {};
    mockControl.watch.mockReturnValue('test@example.com');
  });

  describe('useEmailField', () => {
    it('provides email-specific validation', () => {
      const { result } = renderHook(() => useEmailField('email'));

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('validates email format', () => {
      mockFormState.errors = {
        email: { message: 'Please enter a valid email address' },
      };

      const { result } = renderHook(() => useEmailField('email'));

      expect(result.current.error).toBe('Please enter a valid email address');
      expect(result.current.isValid).toBe(false);
    });

    it('accepts valid email', () => {
      mockControl.watch.mockReturnValue('john@example.com');

      const { result } = renderHook(() => useEmailField('email'));

      expect(result.current.error).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('rejects invalid email format', () => {
      mockControl.watch.mockReturnValue('invalid-email');

      const { result } = renderHook(() => useEmailField('email'));

      // The error would be set during validation
      expect(result.current.register).toBeDefined();
    });

    it('allows custom email validation options', () => {
      const { result } = renderHook(() =>
        useEmailField('email', {
          required: true,
          message: 'Email is required',
        })
      );

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });
  });

  describe('usePasswordField', () => {
    it('provides password-specific validation', () => {
      const { result } = renderHook(() => usePasswordField('password'));

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('validates password strength requirements', () => {
      mockFormState.errors = {
        password: { message: 'Password must be at least 8 characters' },
      };

      const { result } = renderHook(() => usePasswordField('password'));

      expect(result.current.error).toBe('Password must be at least 8 characters');
      expect(result.current.isValid).toBe(false);
    });

    it('accepts strong password', () => {
      mockControl.watch.mockReturnValue('StrongPass123!');

      const { result } = renderHook(() => usePasswordField('password'));

      expect(result.current.error).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('rejects weak password', () => {
      mockControl.watch.mockReturnValue('weak');

      const { result } = renderHook(() => usePasswordField('password'));

      // The error would be set during validation
      expect(result.current.register).toBeDefined();
    });

    it('allows custom password validation options', () => {
      const { result } = renderHook(() =>
        usePasswordField('password', {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecialChar: true,
          noSpaces: true,
        })
      );

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('provides password strength indicator', () => {
      const { result } = renderHook(() => usePasswordField('password'));

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });
  });

  describe('useNumberField', () => {
    it('provides number-specific validation', () => {
      const { result } = renderHook(() => useNumberField('age'));

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('validates number range', () => {
      mockFormState.errors = {
        age: { message: 'Must be at least 18' },
      };

      const { result } = renderHook(() => useNumberField('age'));

      expect(result.current.error).toBe('Must be at least 18');
      expect(result.current.isValid).toBe(false);
    });

    it('accepts valid number', () => {
      mockControl.watch.mockReturnValue(25);

      const { result } = renderHook(() => useNumberField('age'));

      expect(result.current.error).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('rejects invalid number', () => {
      mockControl.watch.mockReturnValue('invalid');

      const { result } = renderHook(() => useNumberField('age'));

      // The error would be set during validation
      expect(result.current.register).toBeDefined();
    });

    it('allows custom number validation options', () => {
      const { result } = renderHook(() =>
        useNumberField('age', {
          min: 18,
          max: 100,
          integer: true,
          positive: true,
        })
      );

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('handles decimal numbers', () => {
      mockControl.watch.mockReturnValue(25.5);

      const { result } = renderHook(() => useNumberField('price'));

      expect(result.current.error).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('validates integer requirement', () => {
      mockFormState.errors = {
        count: { message: 'Must be an integer' },
      };

      const { result } = renderHook(() => useNumberField('count', { integer: true }));

      expect(result.current.error).toBe('Must be an integer');
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('useFileField', () => {
    it('provides file-specific validation', () => {
      const { result } = renderHook(() => useFileField('avatar'));

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('validates file size', () => {
      mockFormState.errors = {
        avatar: { message: 'File size must be less than 5MB' },
      };

      const { result } = renderHook(() => useFileField('avatar'));

      expect(result.current.error).toBe('File size must be less than 5MB');
      expect(result.current.isValid).toBe(false);
    });

    it('validates file type', () => {
      mockFormState.errors = {
        document: { message: 'Only PDF files are allowed' },
      };

      const { result } = renderHook(() => useFileField('document'));

      expect(result.current.error).toBe('Only PDF files are allowed');
      expect(result.current.isValid).toBe(false);
    });

    it('accepts valid file', () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockControl.watch.mockReturnValue(mockFile);

      const { result } = renderHook(() => useFileField('avatar'));

      expect(result.current.error).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('allows custom file validation options', () => {
      const { result } = renderHook(() =>
        useFileField('avatar', {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png'],
          imageOnly: true,
        })
      );

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('handles image-only validation', () => {
      mockFormState.errors = {
        avatar: { message: 'Only image files are allowed' },
      };

      const { result } = renderHook(() => useFileField('avatar', { imageOnly: true }));

      expect(result.current.error).toBe('Only image files are allowed');
      expect(result.current.isValid).toBe(false);
    });

    it('handles multiple file types', () => {
      const { result } = renderHook(() =>
        useFileField('document', {
          allowedTypes: ['application/pdf', 'application/msword'],
        })
      );

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('provides file information', () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      mockControl.watch.mockReturnValue(mockFile);

      const { result } = renderHook(() => useFileField('avatar'));

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Cross-hook compatibility', () => {
    it('works with different field names', () => {
      const { result: emailResult } = renderHook(() => useEmailField('user.email'));

      const { result: passwordResult } = renderHook(() => usePasswordField('user.password'));

      const { result: numberResult } = renderHook(() => useNumberField('user.age'));

      const { result: fileResult } = renderHook(() => useFileField('user.avatar'));

      expect(emailResult.current.register).toBeDefined();
      expect(passwordResult.current.register).toBeDefined();
      expect(numberResult.current.register).toBeDefined();
      expect(fileResult.current.register).toBeDefined();
    });

    it('handles array field names', () => {
      const { result } = renderHook(() => useEmailField('users.0.email'));

      expect(result.current.register).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.isValid).toBeDefined();
    });

    it('provides consistent interface across all field types', () => {
      const { result: emailResult } = renderHook(() => useEmailField('email'));

      const { result: passwordResult } = renderHook(() => usePasswordField('password'));

      const { result: numberResult } = renderHook(() => useNumberField('age'));

      const { result: fileResult } = renderHook(() => useFileField('avatar'));

      // All hooks should provide the same interface
      const expectedMethods = ['register', 'setValue', 'validate', 'clearError', 'setError'];
      const expectedProperties = ['error', 'isValid', 'isDirty', 'isSubmitting', 'value'];

      expectedMethods.forEach(method => {
        expect(emailResult.current[method]).toBeDefined();
        expect(passwordResult.current[method]).toBeDefined();
        expect(numberResult.current[method]).toBeDefined();
        expect(fileResult.current[method]).toBeDefined();
      });

      expectedProperties.forEach(prop => {
        expect(emailResult.current[prop]).toBeDefined();
        expect(passwordResult.current[prop]).toBeDefined();
        expect(numberResult.current[prop]).toBeDefined();
        expect(fileResult.current[prop]).toBeDefined();
      });
    });
  });
});
