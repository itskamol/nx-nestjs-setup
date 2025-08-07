import { z } from 'zod';
import { FaceEventType, Role } from './api';

// Common validation patterns
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters');
const phoneSchema = z.string().regex(/^[+]?[\d\s-()]{10,}$/, 'Please enter a valid phone number');
const departmentSchema = z
  .string()
  .min(2, 'Department must be at least 2 characters')
  .max(100, 'Department must be less than 100 characters');

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    role: z.enum(Role),
    phone: phoneSchema.optional(),
    department: departmentSchema.optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// User management schemas
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(Role),
  isActive: z.boolean().default(true),
  phone: phoneSchema.optional(),
  department: departmentSchema.optional(),
});

export const updateUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: emailSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  role: z.enum(Role).optional(),
  isActive: z.boolean().optional(),
  phone: phoneSchema.optional(),
  department: departmentSchema.optional(),
});

export const updateUserProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
  department: departmentSchema.optional(),
});

// Face recognition schemas
export const faceEnrollmentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  imageData: z.string().min(1, 'Face image data is required'),
  faceData: z.string().min(1, 'Face data is required'),
  confidence: z
    .number()
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1'),
  metadata: z
    .object({
      quality: z
        .number()
        .min(0, 'Quality must be between 0 and 1')
        .max(1, 'Quality must be between 0 and 1'),
      brightness: z
        .number()
        .min(0, 'Brightness must be between 0 and 1')
        .max(1, 'Brightness must be between 0 and 1'),
      blur: z
        .number()
        .min(0, 'Blur must be between 0 and 1')
        .max(1, 'Blur must be between 0 and 1'),
      pose: z
        .object({
          yaw: z
            .number()
            .min(-180, 'Yaw must be between -180 and 180')
            .max(180, 'Yaw must be between -180 and 180'),
          pitch: z
            .number()
            .min(-180, 'Pitch must be between -180 and 180')
            .max(180, 'Pitch must be between -180 and 180'),
          roll: z
            .number()
            .min(-180, 'Roll must be between -180 and 180')
            .max(180, 'Roll must be between -180 and 180'),
        })
        .optional(),
      boundingBox: z
        .object({
          x: z.number().min(0, 'X must be non-negative'),
          y: z.number().min(0, 'Y must be non-negative'),
          width: z.number().min(0, 'Width must be positive'),
          height: z.number().min(0, 'Height must be positive'),
        })
        .optional(),
    })
    .optional(),
});

export const faceRecordUpdateSchema = z.object({
  id: z.string().min(1, 'Face record ID is required'),
  isActive: z.boolean().optional(),
  metadata: z
    .object({
      quality: z
        .number()
        .min(0, 'Quality must be between 0 and 1')
        .max(1, 'Quality must be between 0 and 1')
        .optional(),
      brightness: z
        .number()
        .min(0, 'Brightness must be between 0 and 1')
        .max(1, 'Brightness must be between 0 and 1')
        .optional(),
      blur: z
        .number()
        .min(0, 'Blur must be between 0 and 1')
        .max(1, 'Blur must be between 0 and 1')
        .optional(),
    })
    .optional(),
});

// Statistics and filtering schemas
export const userFiltersSchema = z.object({
  role: z.enum(Role).optional(),
  isActive: z.boolean().optional(),
  department: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1, 'Page must be at least 1').optional(),
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional(),
  sortBy: z
    .enum(['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const faceEventFiltersSchema = z.object({
  eventType: z.enum(FaceEventType).optional(),
  userId: z.string().optional(),
  status: z.enum(['success', 'failed', 'pending']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1, 'Page must be at least 1').optional(),
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional(),
  sortBy: z.enum(['timestamp', 'confidence', 'eventType', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Settings and preferences schemas
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  notifications: z
    .object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sms: z.boolean().default(false),
    })
    .default({ email: true, push: true, sms: false }),
});

export const systemSettingsSchema = z.object({
  faceRecognition: z.object({
    confidenceThreshold: z
      .number()
      .min(0, 'Confidence threshold must be between 0 and 1')
      .max(1, 'Confidence threshold must be between 0 and 1')
      .default(0.7),
    qualityThreshold: z
      .number()
      .min(0, 'Quality threshold must be between 0 and 1')
      .max(1, 'Quality threshold must be between 0 and 1')
      .default(0.6),
    maxFacesPerUser: z
      .number()
      .min(1, 'Max faces must be at least 1')
      .max(10, 'Max faces must be at most 10')
      .default(3),
    retentionDays: z.number().min(1, 'Retention days must be at least 1').default(90),
  }),
  security: z.object({
    passwordMinLength: z
      .number()
      .min(8, 'Password min length must be at least 8')
      .max(32, 'Password min length must be at most 32')
      .default(8),
    sessionTimeout: z
      .number()
      .min(5, 'Session timeout must be at least 5 minutes')
      .max(480, 'Session timeout must be at most 480 minutes')
      .default(30),
    maxLoginAttempts: z
      .number()
      .min(1, 'Max login attempts must be at least 1')
      .max(10, 'Max login attempts must be at most 10')
      .default(5),
  }),
});

// Form types derived from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type UpdateUserProfileData = z.infer<typeof updateUserProfileSchema>;
export type FaceEnrollmentData = z.infer<typeof faceEnrollmentSchema>;
export type FaceRecordUpdateData = z.infer<typeof faceRecordUpdateSchema>;
export type UserFiltersData = z.infer<typeof userFiltersSchema>;
export type FaceEventFiltersData = z.infer<typeof faceEventFiltersSchema>;
export type UserPreferencesData = z.infer<typeof userPreferencesSchema>;
export type SystemSettingsData = z.infer<typeof systemSettingsSchema>;

// Custom validation functions
export const validatePasswordStrength = (
  password: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateImageFile = (file: File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, and WebP images are allowed');
  }

  if (file.size > maxSize) {
    errors.push('Image size must be less than 5MB');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Utility functions for form validation
export const getValidationErrors = <T extends z.ZodSchema<any>>(
  schema: T,
  data: unknown
): { fieldErrors: Record<string, string>; formError?: string } => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { fieldErrors: {} };
  }

  const fieldErrors: Record<string, string> = {};
  const formError = result.error.errors.find((error: any) => error.path.length === 0)?.message;

  result.error.errors.forEach((error: any) => {
    if (error.path.length > 0) {
      const field = error.path.join('.');
      fieldErrors[field] = error.message;
    }
  });

  return { fieldErrors, formError };
};

export const getFieldError = (
  fieldErrors: Record<string, string>,
  fieldName: string
): string | undefined => {
  return fieldErrors[fieldName] || fieldErrors[fieldName.split('.')[0]];
};

// Schema helpers
export const createOptionalSchema = <T extends z.ZodSchema<any>>(schema: T) => {
  return schema.optional();
};

export const createRequiredSchema = <T extends z.ZodSchema<any>>(schema: T, message?: string) => {
  return schema.refine(val => val !== undefined && val !== null && val !== '', {
    message: message || 'This field is required',
  });
};

// Error message maps
export const commonErrorMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  password: 'Password must be at least 8 characters',
  name: 'Name must be at least 2 characters',
  phone: 'Please enter a valid phone number',
  department: 'Department must be at least 2 characters',
  fileTooLarge: 'File size must be less than 5MB',
  invalidFileType: 'Only JPEG, PNG, and WebP files are allowed',
  passwordsMismatch: 'Passwords do not match',
  invalidRole: 'Please select a valid role',
  invalidStatus: 'Please select a valid status',
  invalidDate: 'Please enter a valid date',
  dateRange: 'End date must be after start date',
};

export default {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  updateUserProfileSchema,
  faceEnrollmentSchema,
  faceRecordUpdateSchema,
  userFiltersSchema,
  faceEventFiltersSchema,
  userPreferencesSchema,
  systemSettingsSchema,
  validatePasswordStrength,
  validateImageFile,
  getValidationErrors,
  getFieldError,
  createOptionalSchema,
  createRequiredSchema,
  commonErrorMessages,
};
