// React hook types for better type safety in custom hooks

import { ApiError } from './api';
import { FormHelpers } from './forms';
import { WebSocketMessage, WebSocketSubscription } from './websocket';

// API Hook Types
export interface UseApiOptions<T> {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  onSettled?: (data: T | undefined, error: ApiError | undefined) => void;
  select?: (data: T) => T;
  initialData?: T;
  placeholderData?: T | (() => T);
  keepPreviousData?: boolean;
}

export interface UseApiResult<T> {
  data: T | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
  mutate: (data?: T) => void;
}

export interface UseMutationOptions<T, V = unknown, E = ApiError> {
  mutationFn: (variables: V) => Promise<T>;
  onSuccess?: (data: T, variables: V, context: unknown) => void;
  onError?: (error: E, variables: V, context: unknown) => void;
  onSettled?: (data: T | undefined, error: E | undefined, variables: V, context: unknown) => void;
  onMutate?: (variables: V) => Promise<unknown> | unknown;
  retry?: number | boolean;
  retryDelay?: number;
  networkMode?: 'online' | 'always' | 'offlineFirst';
}

export interface UseMutationResult<T, V = unknown, E = ApiError> {
  data: T | undefined;
  error: E | undefined;
  isError: boolean;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  mutate: (variables: V, options?: UseMutationOptions<T, V, E>) => void;
  mutateAsync: (variables: V, options?: UseMutationOptions<T, V, E>) => Promise<T>;
  reset: () => void;
}

export interface UseInfiniteQueryOptions<T> {
  enabled?: boolean;
  getNextPageParam: (lastPage: T, allPages: T[]) => unknown;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  onSettled?: (data: T | undefined, error: ApiError | undefined) => void;
}

export interface UseInfiniteQueryResult<T> {
  data: T[] | undefined;
  error: ApiError | undefined;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
}

// Form Hook Types
export interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validationRules?: Partial<{
    [K in keyof T]: any;
  }>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  enableReinitialize?: boolean;
  onSubmit?: (values: T, helpers: FormHelpers<T>) => Promise<void> | void;
  onReset?: () => void;
  onChange?: (values: T, changedField: keyof T) => void;
}

export interface UseFormResult<T extends Record<string, unknown>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  setValues: (values: Partial<T>) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  resetForm: () => void;
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

export interface UseFieldProps<T = unknown> {
  name: string;
  initialValue?: T;
  validate?: (value: T) => boolean | string | Promise<boolean | string>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onChange?: (value: T) => void;
  onBlur?: (value: T) => void;
}

export interface UseFieldResult<T = unknown> {
  value: T;
  error?: string;
  touched: boolean;
  setValue: (value: T) => void;
  setError: (error: string) => void;
  setTouched: (touched: boolean) => void;
  validate: () => Promise<boolean>;
  reset: () => void;
}

// WebSocket Hook Types
export interface UseWebSocketOptions {
  enabled?: boolean;
  retryAttempts?: number;
  retryInterval?: number;
  heartbeatInterval?: number;
  onMessage?: (message: WebSocketMessage<unknown>) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  subscriptions?: WebSocketSubscription[];
}

export interface UseWebSocketResult {
  sendMessage: (message: WebSocketMessage<unknown>) => void;
  subscribe: (subscription: WebSocketSubscription) => void;
  unsubscribe: (subscriptionId: string) => void;
  connection: {
    isConnected: boolean;
    reconnectAttempts: number;
  };
  lastMessage: WebSocketMessage<unknown> | null;
}

// Authentication Hook Types
export interface UseAuthOptions {
  onLogin?: (user: unknown) => void;
  onLogout?: () => void;
  onError?: (error: ApiError) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseAuthResult {
  user: unknown | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (data: unknown) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
}

// Theme Hook Types
export interface UseThemeOptions {
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
  onChange?: (theme: 'light' | 'dark' | 'system') => void;
}

export interface UseThemeResult {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

// File Upload Hook Types
export interface UseFileUploadOptions {
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  multiple?: boolean;
  autoUpload?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onProgress?: (progress: number) => void;
  onComplete?: (urls: string[]) => void;
  onError?: (error: string) => void;
}

export interface UseFileUploadResult {
  files: File[];
  progress: number;
  isUploading: boolean;
  error?: string;
  selectFiles: () => void;
  uploadFiles: () => Promise<void>;
  removeFile: (index: number) => void;
  clearFiles: () => void;
}

// Local Storage Hook Types
export interface UseLocalStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  onError?: (error: Error) => void;
}

export interface UseLocalStorageResult<T> {
  value: T | null;
  setValue: (value: T) => void;
  removeValue: () => void;
}

// Debounce Hook Types
export interface UseDebounceOptions {
  delay?: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface UseDebounceResult<T> {
  value: T;
  setValue: (value: T) => void;
  isPending: boolean;
  cancel: () => void;
  flush: () => void;
}

// Throttle Hook Types
export interface UseThrottleOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface UseThrottleResult<T> {
  value: T;
  setValue: (value: T) => void;
  isThrottled: boolean;
  cancel: () => void;
  flush: () => void;
}

// Note: Types are exported through the main index.ts file
