import { act, renderHook } from '@testing-library/react';
import { useEmailField, useNumberField, usePasswordField } from '@/hooks/useField';

describe('Specialized Field Hooks', () => {
  describe('useEmailField', () => {
    it('validates email format', async () => {
      const { result } = renderHook(() => useEmailField({}));

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBe('Please enter a valid email address');
    });
  });

  describe('usePasswordField', () => {
    it('validates password strength', async () => {
      const { result } = renderHook(() => usePasswordField({}));

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBe('Password must be at least 8 characters');
    });
  });

  describe('useNumberField', () => {
    it('validates number format', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const { result } = renderHook(() => useNumberField({ initialValue: 'not' }));

      await act(async () => {
        await result.current.validate();
      });

      expect(result.current.isValid).toBe(false);
    });
  });
});
