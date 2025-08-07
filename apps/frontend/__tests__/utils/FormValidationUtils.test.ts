import { FormValidationUtils } from '@/utils/formValidation';
import { z } from 'zod';

describe('FormValidationUtils', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    age: z.number().min(18, 'Must be at least 18 years old'),
  });

  describe('getErrorMessages', () => {
    it('extracts error messages from Zod error', () => {
      const result = testSchema.safeParse({
        name: '',
        email: 'invalid-email',
        age: 16,
      });

      if (!result.success) {
        const errors = FormValidationUtils.getErrorMessages(result.error);
        expect(errors).toEqual({
          name: 'Name is required',
          email: 'Invalid email address',
          age: 'Must be at least 18 years old',
        });
      }
    });

    it('handles nested field paths', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1, 'Name is required'),
          }),
        }),
      });

      const result = nestedSchema.safeParse({
        user: {
          profile: {
            name: '',
          },
        },
      });

      if (!result.success) {
        const errors = FormValidationUtils.getErrorMessages(result.error);
        expect(errors).toEqual({
          'user.profile.name': 'Name is required',
        });
      }
    });
  });

  describe('hasErrors', () => {
    it('returns true when there are errors', () => {
      const errors = {
        name: 'Name is required',
        email: 'Invalid email address',
      };
      expect(FormValidationUtils.hasErrors(errors)).toBe(true);
    });

    it('returns false when there are no errors', () => {
      const errors = {};
      expect(FormValidationUtils.hasErrors(errors)).toBe(false);
    });
  });

  describe('getFirstError', () => {
    it('returns the first error message', () => {
      const errors = {
        name: 'Name is required',
        email: 'Invalid email address',
      };
      expect(FormValidationUtils.getFirstError(errors)).toBe('Name is required');
    });

    it('returns undefined when there are no errors', () => {
      const errors = {};
      expect(FormValidationUtils.getFirstError(errors)).toBeUndefined();
    });
  });

  describe('clearFieldError', () => {
    it('removes specific field error', () => {
      const errors = {
        name: 'Name is required',
        email: 'Invalid email address',
      };
      const clearedErrors = FormValidationUtils.clearFieldError(errors, 'name');
      expect(clearedErrors).toEqual({
        email: 'Invalid email address',
      });
    });
  });

  describe('clearAllErrors', () => {
    it('returns empty object', () => {
      const clearedErrors = FormValidationUtils.clearAllErrors();
      expect(clearedErrors).toEqual({});
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(FormValidationUtils.formatFileSize(0)).toBe('0 Bytes');
      expect(FormValidationUtils.formatFileSize(1024)).toBe('1 KB');
      expect(FormValidationUtils.formatFileSize(1048576)).toBe('1 MB');
      expect(FormValidationUtils.formatFileSize(1073741824)).toBe('1 GB');
    });

    it('handles decimal values correctly', () => {
      expect(FormValidationUtils.formatFileSize(1536)).toBe('1.5 KB');
      expect(FormValidationUtils.formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('validateForm', () => {
    it('returns success for valid data', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const result = await FormValidationUtils.validateForm(testSchema, validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toBeUndefined();
    });

    it('returns errors for invalid data', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: 16,
      };

      const result = await FormValidationUtils.validateForm(testSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toEqual({
        name: 'Name is required',
        email: 'Invalid email address',
        age: 'Must be at least 18 years old',
      });
    });

    it('handles unexpected errors', async () => {
      const mockSchema = {
        parseAsync: jest.fn(() => {
          throw new Error('Unexpected error');
        }),
      };

      const result = await FormValidationUtils.validateForm(mockSchema as any, {});
      expect(result.success).toBe(false);
      expect(result.errors).toEqual({
        form: 'An unexpected error occurred',
      });
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debounces function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = FormValidationUtils.debounce(mockFn, 1000);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('resets timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = FormValidationUtils.debounce(mockFn, 1000);

      debouncedFn('arg1');
      jest.advanceTimersByTime(500);
      debouncedFn('arg2');
      jest.advanceTimersByTime(500);
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });
  });
});
