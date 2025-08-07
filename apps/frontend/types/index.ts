import { Role } from './api';

// Core API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
  timestamp: string;
  stack?: string;
}

// User Management Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  phone?: string;
  department?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  phone?: string;
  department?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: string;
}

export interface UserFilters {
  role?: Role;
  isActive?: boolean;
  search?: string;
  department?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

// Face Recognition Types
export interface FaceRecord {
  id: string;
  userId: string;
  faceId: string;
  imageData: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata?: FaceMetadata;
}

export interface FaceMetadata {
  quality: number;
  brightness: number;
  blur: number;
  pose?: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FaceEnrollmentRequest {
  userId: string;
  imageData: string;
  metadata?: Partial<FaceMetadata>;
}

export interface FaceRecognitionEvent {
  id: string;
  userId?: string;
  faceId: string;
  confidence: number;
  timestamp: string;
  eventType: 'recognition' | 'enrollment' | 'verification';
  status: 'success' | 'failed' | 'pending';
  imageUrl?: string;
  location?: string;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
  phone?: string;
  department?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Form Types
export interface FormField<T = unknown> {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
  dirty?: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  fields: {
    [K in keyof T]: FormField<T[K]>;
  };
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

export interface ValidationRule<T = unknown> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  message?: string;
}

// WebSocket Types
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
  messageId: string;
  clientId?: string;
}

export enum WebSocketMessageType {
  FACE_RECOGNITION = 'face_recognition',
  USER_UPDATE = 'user_update',
  SYSTEM_EVENT = 'system_event',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
  NOTIFICATION = 'notification',
}

export interface WebSocketConnection {
  id: string;
  isConnected: boolean;
  reconnectAttempts: number;
  lastMessage?: string;
  lastPing?: string;
}

// Statistics Types
export interface FaceRecognitionStats {
  totalFaceRecords: number;
  activeFaceRecords: number;
  totalEvents: number;
  eventsToday: number;
  recognitionAccuracy: number;
  topLocations: Array<{
    location: string;
    count: number;
  }>;
  eventsByType: {
    RECOGNIZED: number;
    UNKNOWN: number;
    ENROLLED: number;
    UPDATED: number;
    DELETED: number;
    FAILED?: number;
  };
  lastUpdated: string;
}

export interface DailyStats {
  date: string;
  recognitions: number;
  successes: number;
  failures: number;
  averageConfidence: number;
}

export interface UserStats {
  userId: string;
  userName: string;
  recognitions: number;
  lastRecognition?: string;
  averageConfidence: number;
}

export interface QualityStats {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  averageQuality: number;
}

// UI Component Types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  reduceMotion: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  data?: unknown;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

export interface TableConfig<T> {
  columns: TableColumn<T>[];
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  sorting?: {
    sortBy: keyof T;
    sortOrder: 'asc' | 'desc';
    onSort: (sortBy: keyof T, sortOrder: 'asc' | 'desc') => void;
  };
  selection?: {
    selectedRows: T[];
    onSelectionChange: (rows: T[]) => void;
    multiSelect?: boolean;
  };
}

// File Upload Types
export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'success' | 'error' | 'pending';
  progress: number;
  error?: string;
}

export interface FileUploadConfig {
  maxFiles: number;
  maxSize: number;
  allowedTypes: string[];
  multiple: boolean;
  autoUpload: boolean;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  duration?: number;
  actions?: NotificationAction[];
  read: boolean;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target?: string;
  targetType?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export interface ActivityFilters {
  userId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type SortDirection = 'asc' | 'desc';
export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan';

export interface FilterCondition<T> {
  field: keyof T;
  operator: FilterOperator;
  value: unknown;
}

export interface AdvancedFilters<T> {
  conditions: FilterCondition<T>[];
  logic: 'AND' | 'OR';
}

// API Client Types
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  retryConfig?: {
    retries: number;
    retryDelay: number;
    retryCondition: (error: unknown) => boolean;
  };
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  onUploadProgress?: (progressEvent: ProgressEvent) => void;
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
}

// Hook Types
export interface UseApiOptions<T> {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  select?: (data: T) => T;
}

export interface UseMutationOptions<T, V = unknown> {
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: ApiError, variables: V) => void;
  onMutate?: (variables: V) => Promise<unknown> | unknown;
  onSettled?: (data: T | undefined, error: ApiError | undefined, variables: V) => void;
  retry?: number;
}

// Export all types
export * from './api';
export * from './forms';
export * from './websocket';
export * from './hooks';
export * from './utils';
export * from './schemas';

// Version info
export const TYPES_VERSION = '1.0.0';
