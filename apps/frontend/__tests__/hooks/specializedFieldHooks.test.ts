import { act, renderHook } from '@testing-library/react';
import { useEmailField, usePasswordField, useNumberField } from '@/hooks/useField';

describe('Specialized Field Hooks', () => {
  describe('useEmailField', () => {
    it('validates email format', async () => {
      const { result } = renderHook(() => useEmailField({}));

      await act(async () => {
        await result.current.validate('invalid-email');
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBe('Please enter a valid email address');

      await act(async () => {
        await result.current.validate('valid@email.com');
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('usePasswordField', () => {
    it('validates password strength', async () => {
      const { result } = renderHook(() => usePasswordField({}));

      await act(async () => {
        await result.current.validate('short');
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBe('Password must be at least 8 characters');

      await act(async () => {
        await result.current.validate('longenough');
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('useNumberField', () => {
    it('validates number format', async () => {
      const { result } = renderHook(() => useNumberField({}));

      await act(async () => {
        // @ts-ignore
        await result.current.validate('not a number');
      });

      expect(result.current.isValid).toBe(false);

      await act(async () => {
        await result.current.validate(123);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.error).toBeUndefined();
    });
  });
});
