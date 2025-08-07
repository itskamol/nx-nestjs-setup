// Form validation and state management types

export interface FormField<T = unknown> {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
  dirty?: boolean;
  validating?: boolean;
  disabled?: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  fields: {
    [K in keyof T]: FormField<T[K]>;
  };
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
  isDirty: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export interface ValidationRule<T = unknown> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string | Promise<boolean | string>;
  message?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FormConfig<T extends Record<string, unknown>> {
  initialValues: T;
  validationRules?: Partial<{
    [K in keyof T]: ValidationRule<T[K]> | ValidationRule<T[K]>[];
  }>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  enableReinitialize?: boolean;
  onSubmit?: (values: T) => Promise<void> | void;
  onReset?: () => void;
  onChange?: (values: T, changedField: keyof T) => void;
}

export interface FormHelpers<T extends Record<string, unknown>> {
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  setValues: (values: Partial<T>) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  resetForm: () => void;
  validateForm: () => Promise<boolean>;
  validateField: (field: keyof T) => Promise<boolean>;
  setFieldDisabled: (field: keyof T, disabled: boolean) => void;
}

export interface FormContext<T extends Record<string, unknown>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  handleReset: (e?: React.FormEvent) => void;
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    error?: string;
    touched?: boolean;
  };
}

// Validation schemas
export interface ValidationSchema<T> {
  validate: (data: T) => ValidationResult<T>;
  parse?: (data: unknown) => T;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
  error?: string;
}

// Form field types
export interface TextFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  autoComplete?: string;
  helperText?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
}

export interface SelectFieldProps<T = string> {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  options: SelectOption<T>[];
  value?: T | T[];
  onChange?: (value: T | T[]) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface CheckboxFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface RadioGroupProps<T = string> {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  options: RadioOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface RadioOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface FileFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  value?: File | File[];
  onChange?: (files: File | File[]) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface DateFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  value?: Date | string;
  onChange?: (date: Date | null) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  minDate?: Date;
  maxDate?: Date;
  helperText?: string;
  error?: string;
  className?: string;
}

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export interface FormErrorProps {
  error?: string;
  touched?: boolean;
  className?: string;
}

export interface FormHelperProps {
  text?: string;
  error?: boolean;
  className?: string;
}

// Form submission types
export interface FormSubmission<T> {
  values: T;
  setSubmitting: (isSubmitting: boolean) => void;
  setErrors: (errors: Record<string, string>) => void;
  resetForm: () => void;
}

export interface FormSubmitResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

// Form validation utilities
export interface Validator<T = unknown> {
  (value: T): boolean | string | Promise<boolean | string>;
}

export interface AsyncValidator<T = unknown> {
  (value: T): Promise<boolean | string>;
}

export interface ValidationContext {
  form: Record<string, unknown>;
  field: string;
  values: Record<string, unknown>;
}

export interface FieldValidationConfig {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  debounceMs?: number;
  asyncDebounceMs?: number;
}

// Note: Types are exported through the main index.ts file
