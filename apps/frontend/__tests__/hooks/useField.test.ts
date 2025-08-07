import { act, renderHook } from '@testing-library/react';
import { useField } from '@/hooks/useField';
import { z } from 'zod';

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

describe('useField hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormState.errors = {};
  });

  it('provides field registration', () => {
    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.register).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.isValid).toBeDefined();
  });

  it('returns field error when present', () => {
    mockFormState.errors = {
      email: { message: 'Invalid email address' },
    };

    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.error).toBe('Invalid email address');
    expect(result.current.isValid).toBe(false);
  });

  it('returns no error when field is valid', () => {
    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.error).toBeUndefined();
    expect(result.current.isValid).toBe(true);
  });

  it('allows setting field value', () => {
    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    act(() => {
      result.current.setValue('john@example.com');
    });

    expect(mockControl.setValue).toHaveBeenCalledWith('email', 'john@example.com');
  });

  it('allows triggering field validation', () => {
    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    act(() => {
      result.current.validate();
    });

    expect(mockControl.trigger).toHaveBeenCalledWith('email');
  });

  it('allows clearing field error', () => {
    mockFormState.errors = {
      email: { message: 'Invalid email address' },
    };

    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    act(() => {
      result.current.clearError();
    });

    expect(mockControl.clearErrors).toHaveBeenCalledWith('email');
  });

  it('allows setting custom field error', () => {
    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    act(() => {
      result.current.setError('Custom error message');
    });

    expect(mockControl.setError).toHaveBeenCalledWith('email', {
      message: 'Custom error message',
    });
  });

  it('works with nested field names', () => {
    mockFormState.errors = {
      'user.profile.email': { message: 'Invalid email address' },
    };

    const { result } = renderHook(() =>
      useField('user.profile.email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.error).toBe('Invalid email address');
    expect(result.current.isValid).toBe(false);
  });

  it('handles array field names', () => {
    mockFormState.errors = {
      'items.0.name': { message: 'Name is required' },
    };

    const { result } = renderHook(() =>
      useField('items.0.name', {
        schema: z.string().min(1, 'Name is required'),
      })
    );

    expect(result.current.error).toBe('Name is required');
    expect(result.current.isValid).toBe(false);
  });

  it('provides field value watching', () => {
    mockControl.watch.mockReturnValue('john@example.com');

    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.value).toBe('john@example.com');
  });

  it('handles undefined field values', () => {
    mockControl.watch.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.value).toBeUndefined();
  });

  it('works with different validation schemas', () => {
    const { result } = renderHook(() =>
      useField('age', {
        schema: z.number().min(18, 'Must be at least 18'),
      })
    );

    expect(result.current.register).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.isValid).toBeDefined();
  });

  it('works with boolean fields', () => {
    const { result } = renderHook(() =>
      useField('isActive', {
        schema: z.boolean(),
      })
    );

    expect(result.current.register).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.isValid).toBeDefined();
  });

  it('works with date fields', () => {
    const { result } = renderHook(() =>
      useField('birthDate', {
        schema: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      })
    );

    expect(result.current.register).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.isValid).toBeDefined();
  });

  it('handles custom validation options', () => {
    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
        validateOnBlur: true,
        validateOnChange: true,
      })
    );

    expect(result.current.register).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.isValid).toBeDefined();
  });

  it('provides dirty state information', () => {
    mockFormState.isDirty = true;

    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.isDirty).toBe(true);
  });

  it('provides submitting state information', () => {
    mockFormState.isSubmitting = true;

    const { result } = renderHook(() =>
      useField('email', {
        schema: z.string().email('Invalid email address'),
      })
    );

    expect(result.current.isSubmitting).toBe(true);
  });
});
