import { act, renderHook } from '@testing-library/react';
import { useField } from '@/hooks/useField';
import { z } from 'zod';

describe('useField hook', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));

    expect(result.current.value).toBe('');
    expect(result.current.error).toBeUndefined();
    expect(result.current.touched).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isValidating).toBe(false);
  });

  it('sets value and marks field as dirty', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));

    act(() => {
      result.current.setValue('test');
    });

    expect(result.current.value).toBe('test');
    expect(result.current.isDirty).toBe(true);
  });

  it('validates with a Zod schema', async () => {
    const schema = z.string().min(3, 'Too short');
    const { result } = renderHook(() => useField({ initialValue: '', validationSchema: schema }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('Too short');
  });

  it('handles async validation', async () => {
    const asyncValidation = async (value: string) => {
      return value === 'test' ? 'Invalid' : undefined;
    };
    const { result } = renderHook(() => useField({ initialValue: 'test', asyncValidation }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('Invalid');
  });

  it('resets to initial state', () => {
    const { result } = renderHook(() => useField({ initialValue: '' }));

    act(() => {
      result.current.setValue('test');
      result.current.setTouched(true);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.value).toBe('');
    expect(result.current.touched).toBe(false);
  });
});
