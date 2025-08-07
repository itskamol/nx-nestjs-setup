// Enhanced API types with comprehensive type safety

// Base API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: string;
  requestId?: string;
  version?: string;
}

// Enhanced paginated response
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
  filters?: Record<string, unknown>;
  sort?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

// Enhanced error response
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, string>;
  validationErrors?: ValidationError[];
  timestamp: string;
  path?: string;
  method?: string;
  stack?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  constraints?: Record<string, string>;
}

// Enhanced authentication types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  captchaToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
  phone?: string;
  department?: string;
  captchaToken?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
  permissions: Permission[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
  captchaToken?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
  captchaToken?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Enhanced user types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  avatar?: string;
  phone?: string;
  department?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
  metadata?: UserMetadata;
}

export interface UserMetadata {
  preferences?: UserPreferences;
  statistics?: UserStatistics;
  notes?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface UserStatistics {
  loginCount: number;
  lastLoginAt?: string;
  faceRecognitionCount: number;
  createdAt: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
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
  permissions?: Permission[];
  avatar?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: string;
}

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
  department?: string;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface UserFilters {
  roles?: Role[];
  isActive?: boolean;
  departments?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

// Enhanced face recognition types
export interface FaceRecord {
  id: string;
  userId?: string;
  faceId: string;
  imageData: string;
  faceData: string;
  confidence: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  metadata?: FaceMetadata;
  quality?: FaceQuality;
}

export interface FaceMetadata {
  boundingBox?: BoundingBox;
  landmarks?: Landmark[];
  descriptors?: number[];
  embedding?: number[];
  pose?: FacePose;
  attributes?: FaceAttributes;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Landmark {
  x: number;
  y: number;
  type: string;
}

export interface FacePose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceAttributes {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  glasses?: boolean;
  smile?: boolean;
  eyesOpen?: boolean;
  mouthOpen?: boolean;
}

export interface FaceQuality {
  overall: number;
  brightness: number;
  blur: number;
  contrast: number;
  sharpness: number;
}

export interface CreateFaceRecordRequest {
  userId?: string;
  faceId: string;
  imageData: string;
  faceData: string;
  confidence: number;
  metadata?: Partial<FaceMetadata>;
}

export interface UpdateFaceRecordRequest {
  id: string;
  isActive?: boolean;
  metadata?: Partial<FaceMetadata>;
}

export interface FaceRecognitionEvent {
  id: string;
  faceRecordId?: string;
  faceId?: string;
  userId?: string;
  eventType: FaceEventType;
  confidence: number;
  timestamp: string;
  cameraId?: string;
  location?: string;
  imageData?: string;
  metadata?: EventMetadata;
  faceRecord?: FaceRecord;
  user?: User;
  deviceInfo?: DeviceInfo;
  status: 'success' | 'failed' | 'pending';
}

export interface EventMetadata {
  processingTime?: number;
  algorithm?: string;
  version?: string;
  confidenceThreshold?: number;
  additionalInfo?: Record<string, unknown>;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
}

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

export interface UserStats {
  userId: string;
  userName: string;
  recognitionCount: number;
  averageConfidence: number;
  lastRecognition?: string;
}

export interface QualityStats {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  averageQuality: number;
}

export interface TimeStats {
  averageProcessingTime: number;
  peakHours: number[];
  dailyPattern: DailyStats[];
}

export interface DailyStats {
  date: string;
  recognitions: number;
  successes: number;
  failures: number;
  averageConfidence: number;
}

// Role and permission types
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  VIEWER = 'VIEWER',
  SECURITY_OFFICER = 'SECURITY_OFFICER',
}

export enum Permission {
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  DELETE_USERS = 'delete:users',
  READ_FACES = 'read:faces',
  WRITE_FACES = 'write:faces',
  DELETE_FACES = 'delete:faces',
  READ_EVENTS = 'read:events',
  WRITE_EVENTS = 'write:events',
  MANAGE_SYSTEM = 'manage:system',
  EXPORT_DATA = 'export:data',
  VIEW_STATISTICS = 'view:statistics',
}

export enum FaceEventType {
  DETECTED = 'DETECTED',
  RECOGNIZED = 'RECOGNIZED',
  UNKNOWN = 'UNKNOWN',
  ENROLLED = 'ENROLLED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  VERIFICATION_SUCCESS = 'VERIFICATION_SUCCESS',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  QUALITY_CHECK = 'QUALITY_CHECK',
}

// Note: Types are exported through the main index.ts file
