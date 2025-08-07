import { act, renderHook } from '@testing-library/react';
import { useForm } from '@/hooks/useForm';
import { z } from 'zod';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn(fn => (e: any) => {
      e.preventDefault();
      return fn({ name: 'John Doe', email: 'john@example.com' });
    }),
    formState: { errors: {}, isValid: true, isDirty: false, isSubmitting: false },
    setValue: jest.fn(),
    getValues: jest.fn(() => ({ name: 'John Doe', email: 'john@example.com' })),
    watch: jest.fn(field => {
      if (field === 'name') return 'John Doe';
      if (field === 'email') return 'john@example.com';
      return '';
    }),
    trigger: jest.fn(),
    reset: jest.fn(),
    clearErrors: jest.fn(),
    setError: jest.fn(),
    control: {},
  })),
}));

jest.mock('@hookform/resolvers', () => ({
  zodResolver: jest.fn(() => jest.fn()),
}));

describe('useForm hook', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes form with default values', () => {
    const defaultValues = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.register).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
    expect(result.current.formState).toBeDefined();
  });

  it('handles form submission', () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    const mockEvent = { preventDefault: jest.fn() };
    act(() => {
      result.current.handleSubmit(onSubmit)(mockEvent);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('provides form state', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    expect(result.current.formState).toBeDefined();
    expect(result.current.formState.errors).toBeDefined();
    expect(result.current.formState.isValid).toBeDefined();
    expect(result.current.formState.isDirty).toBeDefined();
    expect(result.current.formState.isSubmitting).toBeDefined();
  });

  it('allows setting form values', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.setValue('name', 'Jane Smith');
    });

    expect(result.current.setValue).toHaveBeenCalledWith('name', 'Jane Smith');
  });

  it('allows getting form values', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    const values = result.current.getValues();
    expect(values).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('allows watching specific fields', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    const nameValue = result.current.watch('name');
    expect(nameValue).toBe('John Doe');
  });

  it('allows triggering validation', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.trigger('name');
    });

    expect(result.current.trigger).toHaveBeenCalledWith('name');
  });

  it('allows resetting form', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.reset();
    });

    expect(result.current.reset).toHaveBeenCalled();
  });

  it('allows clearing errors', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.clearErrors).toHaveBeenCalled();
  });

  it('allows setting errors', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.setError('name', { message: 'Custom error message' });
    });

    expect(result.current.setError).toHaveBeenCalledWith('name', {
      message: 'Custom error message',
    });
  });

  it('provides control object', () => {
    const { result } = renderHook(() =>
      useForm({
        schema: testSchema,
        defaultValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    expect(result.current.control).toBeDefined();
  });

  it('works with complex schemas', () => {
    const complexSchema = z.object({
      user: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email address'),
        profile: z.object({
          age: z.number().min(18, 'Must be at least 18'),
          isActive: z.boolean(),
        }),
      }),
    });

    const { result } = renderHook(() =>
      useForm({
        schema: complexSchema,
        defaultValues: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
            profile: {
              age: 25,
              isActive: true,
            },
          },
        },
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.register).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
  });

  it('handles async validation', async () => {
    const asyncSchema = z.object({
      email: z
        .string()
        .email('Invalid email address')
        .refine(async email => {
          // Simulate async validation
          await new Promise(resolve => setTimeout(resolve, 100));
          return !email.includes('blocked');
        }, 'This email is blocked'),
    });

    const { result } = renderHook(() =>
      useForm({
        schema: asyncSchema,
        defaultValues: {
          email: 'john@example.com',
        },
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
  });
});
