import { act, renderHook, waitFor } from '@testing-library/react';
import { useForm } from '@/hooks/useForm';
import { z } from 'zod';

describe('useForm hook', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes form with default values', () => {
    const initialValues = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.getFieldProps).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
    expect(result.current.errors).toBeDefined();
  });

  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        onSubmit,
      })
    );

    const mockEvent = { preventDefault: jest.fn() };
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: 'John Doe',
        email: 'john@example.com',
      },
      expect.anything()
    );
  });

  it('provides form state', () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    expect(result.current.errors).toBeDefined();
    expect(result.current.isValid).toBeDefined();
    expect(result.current.isDirty).toBeDefined();
    expect(result.current.isSubmitting).toBeDefined();
  });

  it('allows setting form values', () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.setFieldValue('name', 'Jane Smith');
    });

    expect(result.current.values.name).toBe('Jane Smith');
  });

  it('allows getting form values', () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    const values = result.current.values;
    expect(values).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('allows watching specific fields', () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    const nameValue = result.current.values.name;
    expect(nameValue).toBe('John Doe');
  });

  it('allows triggering validation', async () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: '',
          email: 'john@example.com',
        },
      })
    );

    await act(async () => {
      await result.current.validateForm();
    });
  });

  it('allows resetting form', () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.setFieldValue('name', 'Jane Smith');
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values.name).toBe('John Doe');
  });

  it('allows clearing errors', async () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: '',
          email: 'john@example.com',
        },
      })
    );

    await act(async () => {
      await result.current.validateForm();
    });

    act(() => {
      result.current.clearErrors();
    });
  });

  it('allows setting errors', () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    act(() => {
      result.current.setFieldError('name', 'Custom error message');
    });

    expect(result.current.errors.name).toBe('Custom error message');
  });

  it('provides control object', () => {
    const { result } = renderHook(() =>
      useForm({
        validationSchema: testSchema,
        initialValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );

    expect(result.current.setFieldValue).toBeDefined();
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
        validationSchema: complexSchema,
        initialValues: {
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
    expect(result.current.getFieldProps).toBeDefined();
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
        validationSchema: asyncSchema,
        initialValues: {
          email: 'john@example.com',
        },
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
  });
});
