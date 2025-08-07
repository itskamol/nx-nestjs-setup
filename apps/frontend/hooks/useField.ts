import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

interface UseFieldOptions<T> {
  initialValue: T;
  validationSchema?: z.ZodSchema<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  asyncValidation?: (value: T) => Promise<string | undefined>;
  onChange?: (value: T) => void;
  onBlur?: (value: T) => void;
}

interface UseFieldResult<T> {
  value: T;
  error?: string;
  touched: boolean;
  isValid: boolean;
  isDirty: boolean;
  isValidating: boolean;
  setValue: (value: T) => void;
  setError: (error: string | undefined) => void;
  setTouched: (touched: boolean) => void;
  reset: () => void;
  validate: () => Promise<boolean>;
  getProps: () => {
    value: T;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    error?: string;
    touched?: boolean;
  };
}

export function useField<T>({
  initialValue,
  validationSchema,
  validateOnChange = true,
  validateOnBlur = true,
  asyncValidation,
  onChange,
  onBlur,
}: UseFieldOptions<T>): UseFieldResult<T> {
  const [value, setValueState] = useState<T>(initialValue);
  const [error, setErrorState] = useState<string | undefined>();
  const [touched, setTouchedState] = useState(false);
  const [isValid, setIsValidState] = useState(true);
  const [isDirty, setIsDirtyState] = useState(false);
  const [isValidating, setIsValidatingState] = useState(false);

  const validate = useCallback(
    async (val: T): Promise<boolean> => {
      setIsValidatingState(true);

      try {
        // Sync validation with Zod schema
        if (validationSchema) {
          await validationSchema.parseAsync(val);
        }

        // Async validation
        if (asyncValidation) {
          const asyncError = await asyncValidation(val);
          if (asyncError) {
            setErrorState(asyncError);
            setIsValidState(false);
            setIsValidatingState(false);
            return false;
          }
        }

        setErrorState(undefined);
        setIsValidState(true);
        setIsValidatingState(false);
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors[0]?.message;
          setErrorState(fieldError);
          setIsValidState(false);
        } else {
          setErrorState('Validation failed');
          setIsValidState(false);
        }
        setIsValidatingState(false);
        return false;
      }
    },
    [validationSchema, asyncValidation]
  );

  const setValue = useCallback(
    (newValue: T) => {
      setValueState(newValue);
      setIsDirtyState(true);

      if (onChange) {
        onChange(newValue);
      }

      if (validateOnChange) {
        validate(newValue);
      }
    },
    [onChange, validateOnChange, validate]
  );

  const setError = useCallback((newError: string | undefined) => {
    setErrorState(newError);
    setIsValidState(!newError);
  }, []);

  const setTouched = useCallback(
    (newTouched: boolean) => {
      setTouchedState(newTouched);

      if (newTouched && validateOnBlur) {
        validate(value);
      }

      if (onBlur) {
        onBlur(value);
      }
    },
    [validateOnBlur, validate, value, onBlur]
  );

  const reset = useCallback(() => {
    setValueState(initialValue);
    setErrorState(undefined);
    setTouchedState(false);
    setIsValidState(true);
    setIsDirtyState(false);
    setIsValidatingState(false);
  }, [initialValue]);

  const getProps = useCallback(
    () => ({
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue =
          e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setValue(newValue as T);
      },
      onBlur: () => setTouched(true),
      error,
      touched,
    }),
    [value, setValue, setTouched, error, touched]
  );

  return {
    value,
    error,
    touched,
    isValid,
    isDirty,
    isValidating,
    setValue,
    setError,
    setTouched,
    reset,
    validate,
    getProps,
  };
}

// Specialized hooks for common field types
export function useTextField(
  options: Omit<UseFieldOptions<string>, 'initialValue'> & { initialValue?: string }
) {
  return useField({
    initialValue: options.initialValue || '',
    ...options,
  });
}

export function useEmailField(
  options: Omit<UseFieldOptions<string>, 'initialValue' | 'validationSchema'> & {
    initialValue?: string;
  }
) {
  const emailSchema = z.string().email('Please enter a valid email address');
  return useField({
    initialValue: options.initialValue || '',
    validationSchema: emailSchema,
    ...options,
  });
}

export function usePasswordField(
  options: Omit<UseFieldOptions<string>, 'initialValue'> & { initialValue?: string }
) {
  const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
  return useField({
    initialValue: options.initialValue || '',
    validationSchema: passwordSchema,
    ...options,
  });
}

export function useNumberField(
  options: Omit<UseFieldOptions<number>, 'initialValue'> & { initialValue?: number }
) {
  return useField({
    initialValue: options.initialValue || 0,
    ...options,
  });
}

export function useBooleanField(
  options: Omit<UseFieldOptions<boolean>, 'initialValue'> & { initialValue?: boolean }
) {
  return useField({
    initialValue: options.initialValue || false,
    ...options,
  });
}

export function useSelectField<T extends string>(
  options: Omit<UseFieldOptions<T>, 'initialValue'> & { initialValue?: T }
) {
  return useField({
    initialValue: options.initialValue || ('' as T),
    ...options,
  });
}

// Hook for validating password strength
export function usePasswordStrength(password: string) {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => {
    const calculateStrength = (pwd: string): { score: number; feedback: string[] } => {
      const feedback: string[] = [];
      let score = 0;

      if (pwd.length >= 8) score += 1;
      else feedback.push('At least 8 characters');

      if (/[A-Z]/.test(pwd)) score += 1;
      else feedback.push('One uppercase letter');

      if (/[a-z]/.test(pwd)) score += 1;
      else feedback.push('One lowercase letter');

      if (/\d/.test(pwd)) score += 1;
      else feedback.push('One number');

      if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score += 1;
      else feedback.push('One special character');

      return { score, feedback };
    };

    const { score, feedback: newFeedback } = calculateStrength(password);
    setStrength(score);
    setFeedback(newFeedback);
  }, [password]);

  const getStrengthLabel = (): string => {
    if (strength <= 1) return 'Very Weak';
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (): string => {
    if (strength <= 1) return 'bg-red-500';
    if (strength <= 2) return 'bg-orange-500';
    if (strength <= 3) return 'bg-yellow-500';
    if (strength <= 4) return 'bg-green-500';
    return 'bg-green-600';
  };

  return {
    strength,
    feedback,
    getStrengthLabel,
    getStrengthColor,
    isValid: strength >= 3,
  };
}

// Hook for file validation
export function useFileField(options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  multiple?: boolean;
  onFileSelect?: (files: File[]) => void;
}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    multiple = false,
    onFileSelect,
  } = options;

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validateFiles = useCallback(
    (fileList: File[]): { validFiles: File[]; errors: string[] } => {
      const validationErrors: string[] = [];
      const validFiles: File[] = [];

      fileList.forEach((file, index) => {
        if (!allowedTypes.includes(file.type)) {
          validationErrors.push(`File ${index + 1}: ${file.name} has an invalid type`);
          return;
        }

        if (file.size > maxSize) {
          validationErrors.push(`File ${index + 1}: ${file.name} is too large`);
          return;
        }

        validFiles.push(file);
      });

      return { validFiles, errors: validationErrors };
    },
    [allowedTypes, maxSize]
  );

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const fileArray = Array.from(selectedFiles);
      if (!multiple && fileArray.length > 1) {
        setErrors(['Please select only one file']);
        return;
      }

      const { validFiles, errors: validationErrors } = validateFiles(fileArray);
      setErrors(validationErrors);
      setFiles(validFiles);

      if (onFileSelect) {
        onFileSelect(validFiles);
      }
    },
    [multiple, validateFiles, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setErrors([]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setErrors([]);
  }, []);

  return {
    files,
    errors,
    isDragging,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearFiles,
    removeFile,
    isValid: files.length > 0 && errors.length === 0,
  };
}
