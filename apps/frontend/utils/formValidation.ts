import { z } from 'zod';
import { useForm as useReactHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

// Re-export react-hook-form types and utilities
export type {
  UseFormProps,
  UseFormReturn,
  FieldValues,
  SubmitHandler,
  FieldError,
} from 'react-hook-form';

// Enhanced useForm hook with Zod integration
export function useForm<T extends FieldValues>(
  props: UseFormProps<T> & {
    schema: z.ZodType<T, any, any>;
  }
): UseFormReturn<T> {
  const { schema, ...formProps } = props;

  return useReactHookForm<T>({
    ...formProps,
    resolver: zodResolver(schema) as any,
  });
}

// Form field components with built-in validation
export const FormFieldTypes = {
  TEXT: 'text',
  EMAIL: 'email',
  PASSWORD: 'password',
  NUMBER: 'number',
  TEL: 'tel',
  URL: 'url',
  DATE: 'date',
  TIME: 'time',
  DATETIME_LOCAL: 'datetime-local',
  MONTH: 'month',
  WEEK: 'week',
  COLOR: 'color',
  SEARCH: 'search',
} as const;

export type FormFieldType = (typeof FormFieldTypes)[keyof typeof FormFieldTypes];

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required') => z.string().min(1, message),
  email: (message = 'Please enter a valid email address') => z.string().email(message),
  minLength: (min: number, message?: string) =>
    z.string().min(min, message || `Minimum ${min} characters required`),
  maxLength: (max: number, message?: string) =>
    z.string().max(max, message || `Maximum ${max} characters allowed`),
  min: (min: number, message?: string) =>
    z.number().min(min, message || `Value must be at least ${min}`),
  max: (max: number, message?: string) =>
    z.number().max(max, message || `Value must be at most ${max}`),
  pattern: (regex: RegExp, message: string) => z.string().regex(regex, message),
  url: (message = 'Please enter a valid URL') => z.string().url(message),
  phone: (message = 'Please enter a valid phone number') =>
    z.string().regex(/^[+]?[\d\s-()]{10,}$/, message),
  date: (message = 'Please enter a valid date') => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message),
  time: (message = 'Please enter a valid time') =>
    z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, message),
} as const;

// Password validation helpers
export const PasswordValidation = {
  minLength: (min = 8) => z.string().min(min, `Password must be at least ${min} characters`),
  uppercase: z.string().regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  lowercase: z.string().regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
  number: z.string().regex(/\d/, 'Password must contain at least one number'),
  specialChar: z
    .string()
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  noSpaces: z.string().regex(/^\S*$/, 'Password cannot contain spaces'),

  // Strong password schema
  strong: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .regex(/^\S*$/, 'Password cannot contain spaces'),
} as const;

// File validation helpers
export const FileValidation = {
  maxSize: (maxSizeInBytes: number, message?: string) =>
    z
      .any()
      .refine(
        (file: File) => !file || file.size <= maxSizeInBytes,
        message || `File size must be less than ${Math.round(maxSizeInBytes / 1024 / 1024)}MB`
      ),

  allowedTypes: (allowedTypes: string[], message?: string) =>
    z
      .any()
      .refine(
        (file: File) => !file || allowedTypes.includes(file.type),
        message || `File type must be one of: ${allowedTypes.join(', ')}`
      ),

  imageOnly: (message = 'Only image files are allowed') =>
    z.any().refine((file: File) => !file || file.type.startsWith('image/'), message),
} as const;

// Form field validation schema builder
export class FormSchemaBuilder<T extends Record<string, any>> {
  private schema: z.ZodObject<any>;

  constructor(initialSchema?: z.ZodObject<any>) {
    this.schema = initialSchema || z.object({});
  }

  addField<K extends keyof T>(
    key: K,
    fieldSchema: z.ZodType<any>,
    options?: { required?: boolean; message?: string }
  ): FormSchemaBuilder<T> {
    let finalSchema = fieldSchema;

    if (options?.required) {
      finalSchema = fieldSchema.refine(val => val !== undefined && val !== null && val !== '', {
        message: options.message || `${String(key)} is required`,
      });
    }

    this.schema = this.schema.extend({
      [key]: finalSchema,
    }) as z.ZodObject<any>;

    return this;
  }

  addStringField<K extends keyof T>(
    key: K,
    options?: {
      required?: boolean;
      min?: number;
      max?: number;
      email?: boolean;
      url?: boolean;
      phone?: boolean;
      pattern?: RegExp;
      message?: string;
    }
  ): FormSchemaBuilder<T> {
    let schema = z.string();

    if (options?.min) {
      schema = schema.min(
        options.min,
        options.message || `${String(key)} must be at least ${options.min} characters`
      );
    }

    if (options?.max) {
      schema = schema.max(
        options.max,
        options.message || `${String(key)} must be at most ${options.max} characters`
      );
    }

    if (options?.email) {
      schema = schema.email(options.message || 'Please enter a valid email address');
    }

    if (options?.url) {
      schema = schema.url(options.message || 'Please enter a valid URL');
    }

    if (options?.phone) {
      schema = schema.regex(
        /^[+]?[\d\s-()]{10,}$/,
        options.message || 'Please enter a valid phone number'
      );
    }

    if (options?.pattern) {
      schema = schema.regex(options.pattern, options.message || 'Invalid format');
    }

    return this.addField(key, schema, { required: options?.required, message: options?.message });
  }

  addNumberField<K extends keyof T>(
    key: K,
    options?: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
      positive?: boolean;
      message?: string;
    }
  ): FormSchemaBuilder<T> {
    let schema = z.number();

    if (options?.min !== undefined) {
      schema = schema.min(
        options.min,
        options.message || `${String(key)} must be at least ${options.min}`
      );
    }

    if (options?.max !== undefined) {
      schema = schema.max(
        options.max,
        options.message || `${String(key)} must be at most ${options.max}`
      );
    }

    if (options?.integer) {
      schema = schema.int(options.message || `${String(key)} must be an integer`);
    }

    if (options?.positive) {
      schema = schema.positive(options.message || `${String(key)} must be positive`);
    }

    return this.addField(key, schema, { required: options?.required, message: options?.message });
  }

  addBooleanField<K extends keyof T>(
    key: K,
    options?: { required?: boolean; message?: string }
  ): FormSchemaBuilder<T> {
    return this.addField(key, z.boolean(), options);
  }

  addDateField<K extends keyof T>(
    key: K,
    options?: { required?: boolean; message?: string }
  ): FormSchemaBuilder<T> {
    return this.addField(
      key,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),
      options
    );
  }

  addArrayField<K extends keyof T>(
    key: K,
    itemSchema: z.ZodType<any>,
    options?: { required?: boolean; min?: number; max?: number; message?: string }
  ): FormSchemaBuilder<T> {
    let schema = z.array(itemSchema);

    if (options?.min !== undefined) {
      schema = schema.min(
        options.min,
        options.message || `${String(key)} must have at least ${options.min} items`
      );
    }

    if (options?.max !== undefined) {
      schema = schema.max(
        options.max,
        options.message || `${String(key)} must have at most ${options.max} items`
      );
    }

    return this.addField(key, schema, options);
  }

  addPasswordField<K extends keyof T>(
    key: K,
    options?: {
      required?: boolean;
      minLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumber?: boolean;
      requireSpecialChar?: boolean;
      noSpaces?: boolean;
      message?: string;
    }
  ): FormSchemaBuilder<T> {
    let schema = z.string();

    if (options?.minLength) {
      schema = schema.min(
        options.minLength,
        options.message || `Password must be at least ${options.minLength} characters`
      );
    }

    if (options?.requireUppercase) {
      schema = schema.regex(/[A-Z]/, 'Password must contain at least one uppercase letter');
    }

    if (options?.requireLowercase) {
      schema = schema.regex(/[a-z]/, 'Password must contain at least one lowercase letter');
    }

    if (options?.requireNumber) {
      schema = schema.regex(/\d/, 'Password must contain at least one number');
    }

    if (options?.requireSpecialChar) {
      schema = schema.regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Password must contain at least one special character'
      );
    }

    if (options?.noSpaces) {
      schema = schema.regex(/^\S*$/, 'Password cannot contain spaces');
    }

    return this.addField(key, schema, { required: options?.required, message: options?.message });
  }

  addFileField<K extends keyof T>(
    key: K,
    options?: {
      required?: boolean;
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      imageOnly?: boolean;
      message?: string;
    }
  ): FormSchemaBuilder<T> {
    let schema = z.any();

    if (options?.maxSize) {
      schema = schema.refine(
        (file: File) => !file || file.size <= options.maxSize!,
        options.message ||
          `File size must be less than ${Math.round(options.maxSize! / 1024 / 1024)}MB`
      );
    }

    if (options?.allowedTypes) {
      schema = schema.refine(
        (file: File) => !file || options.allowedTypes!.includes(file.type),
        options.message || `File type must be one of: ${options.allowedTypes.join(', ')}`
      );
    }

    if (options?.imageOnly) {
      schema = schema.refine(
        (file: File) => !file || file.type.startsWith('image/'),
        options.message || 'Only image files are allowed'
      );
    }

    return this.addField(key, schema, options);
  }

  build(): z.ZodSchema<T> {
    return this.schema as z.ZodSchema<T>;
  }
}

// Form validation utilities
export const FormValidationUtils = {
  // Get all validation errors from a Zod error
  getErrorMessages: (error: z.ZodError<any>): Record<string, string> => {
    const errors: Record<string, string> = {};

    error.issues.forEach(err => {
      const field = err.path.join('.');
      errors[field] = err.message;
    });

    return errors;
  },

  // Check if form has any errors
  hasErrors: (errors: Record<string, string>): boolean => {
    return Object.keys(errors).length > 0;
  },

  // Get the first error message
  getFirstError: (errors: Record<string, string>): string | undefined => {
    const errorKeys = Object.keys(errors);
    return errorKeys.length > 0 ? errors[errorKeys[0]] : undefined;
  },

  // Clear specific field error
  clearFieldError: (errors: Record<string, string>, fieldName: string): Record<string, string> => {
    const newErrors = { ...errors };
    delete newErrors[fieldName];
    return newErrors;
  },

  // Clear all errors
  clearAllErrors: (): Record<string, string> => {
    return {};
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  // Validate form data against schema
  validateForm: async <T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): Promise<{
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
  }> => {
    try {
      const result = await schema.parseAsync(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: FormValidationUtils.getErrorMessages(error as z.ZodError<any>),
        };
      }
      return {
        success: false,
        errors: { form: 'An unexpected error occurred' },
      };
    }
  },

  // Debounce validation
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },
} as const;
