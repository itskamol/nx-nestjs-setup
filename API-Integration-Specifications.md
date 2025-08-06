# API Integration Specifications for Frontend

## 1. API Client Configuration

### 1.1. Base Configuration
```typescript
// src/services/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-toastify';

interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: ApiConfig) {
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: config.headers,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.refreshToken) {
            try {
              const newToken = await this.refreshAccessToken();
              this.token = newToken;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.instance(originalRequest);
            } catch (refreshError) {
              this.logout();
              return Promise.reject(refreshError);
            }
          } else {
            this.logout();
          }
        }

        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    const response = await this.instance.post('/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    return response.data.data.accessToken;
  }

  private handleError(error: any): void {
    const message = error.response?.data?.message || error.message;
    
    switch (error.response?.status) {
      case 400:
        toast.error('Bad request: ' + message);
        break;
      case 401:
        toast.error('Unauthorized: Please login again');
        break;
      case 403:
        toast.error('Forbidden: You don\'t have permission');
        break;
      case 404:
        toast.error('Not found: ' + message);
        break;
      case 500:
        toast.error('Server error: Please try again later');
        break;
      default:
        toast.error('An error occurred: ' + message);
    }
  }

  private logout(): void {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  public clearTokens(): void {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put(url, data, config);
  }

  public patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete(url, config);
  }
}

export const apiClient = new ApiClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 1.2. TypeScript Types
```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: Role;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
}

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
}

// Face recognition types
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
}

export interface CreateFaceRecordRequest {
  userId?: string;
  faceId: string;
  imageData: string;
  faceData: string;
  confidence: number;
}

export interface FaceRecognitionEvent {
  id: string;
  faceRecordId?: string;
  faceId?: string;
  eventType: FaceEventType;
  confidence: number;
  timestamp: string;
  cameraId?: string;
  location?: string;
  imageData?: string;
  metadata?: any;
  faceRecord?: FaceRecord;
}

export interface FaceRecognitionStats {
  totalFaces: number;
  activeFaces: number;
  totalEvents: number;
  eventsToday: number;
  recognitionRate: number;
  averageConfidence: number;
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum FaceEventType {
  DETECTED = 'DETECTED',
  RECOGNIZED = 'RECOGNIZED',
  UNKNOWN = 'UNKNOWN',
  ENROLLED = 'ENROLLED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}
```

## 2. Authentication Service

### 2.1. Service Implementation
```typescript
// src/services/api/auth.service.ts
import { apiClient } from './client';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  ApiResponse,
  User 
} from '../../types/api';

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    
    const { accessToken, refreshToken, user } = response.data.data;
    apiClient.setTokens(accessToken, refreshToken);
    
    return { accessToken, refreshToken, user };
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      userData
    );
    
    const { accessToken, refreshToken, user } = response.data.data;
    apiClient.setTokens(accessToken, refreshToken);
    
    return { accessToken, refreshToken, user };
  }

  static async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/refresh',
      { refreshToken }
    );
    
    const { accessToken, refreshToken: newRefreshToken, user } = response.data.data;
    apiClient.setTokens(accessToken, newRefreshToken);
    
    return { accessToken, refreshToken: newRefreshToken, user };
  }

  static async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken });
    }
    apiClient.clearTokens();
  }

  static async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  static getUserFromToken(): User | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user;
    } catch (error) {
      return null;
    }
  }
}
```

### 2.2. Authentication Hook
```typescript
// src/hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { AuthService } from '../services/api/auth.service';
import { User } from '../types/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (AuthService.isAuthenticated()) {
          const currentUser = await AuthService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        AuthService.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const { user } = await AuthService.login(credentials);
    setUser(user);
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const { user } = await AuthService.register(userData);
    setUser(user);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

## 3. Users Service

### 3.1. Service Implementation
```typescript
// src/services/api/users.service.ts
import { apiClient } from './client';
import { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UsersQueryParams,
  PaginatedResponse,
  ApiResponse 
} from '../../types/api';

export class UsersService {
  static async getUsers(params?: UsersQueryParams): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<User>>>(
      '/users',
      { params }
    );
    return response.data.data;
  }

  static async getUser(id: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  }

  static async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', userData);
    return response.data.data;
  }

  static async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data.data;
  }

  static async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  static async activateUser(id: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(
      `/users/${id}/activate`
    );
    return response.data.data;
  }

  static async deactivateUser(id: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(
      `/users/${id}/deactivate`
    );
    return response.data.data;
  }

  static async getCurrentUserProfile(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/users/me');
    return response.data.data;
  }

  static async updateCurrentUserProfile(userData: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>('/users/me', userData);
    return response.data.data;
  }

  static async updateCurrentUserPassword(newPassword: string): Promise<void> {
    await apiClient.patch('/users/me/password', { newPassword });
  }
}
```

### 3.2. Users Hook
```typescript
// src/hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { UsersService } from '../services/api/users.service';
import { User, UsersQueryParams, PaginatedResponse } from '../types/api';

export function useUsers(params?: UsersQueryParams) {
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (queryParams?: UsersQueryParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await UsersService.getUsers(queryParams);
      setUsers(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: any) => {
    setLoading(true);
    try {
      await UsersService.createUser(userData);
      await fetchUsers(params);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, userData: any) => {
    setLoading(true);
    try {
      await UsersService.updateUser(id, userData);
      await fetchUsers(params);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    setLoading(true);
    try {
      await UsersService.deleteUser(id);
      await fetchUsers(params);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(params);
  }, [JSON.stringify(params)]);

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refetch: () => fetchUsers(params),
  };
}

export function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await UsersService.getUser(id);
      setUser(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUser();
    }
  }, [id]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
```

## 4. Face Recognition Service

### 4.1. Service Implementation
```typescript
// src/services/api/faceRecognition.service.ts
import { apiClient } from './client';
import { 
  FaceRecord, 
  CreateFaceRecordRequest, 
  FaceRecognitionEvent,
  FaceRecognitionStats,
  ApiResponse,
  PaginatedResponse 
} from '../../types/api';

export class FaceRecognitionService {
  static async enrollFace(faceData: CreateFaceRecordRequest): Promise<FaceRecord> {
    const response = await apiClient.post<ApiResponse<FaceRecord>>(
      '/face-recognition/enroll',
      faceData
    );
    return response.data.data;
  }

  static async recognizeFace(imageData: string): Promise<{
    recognizedFaces: FaceRecord[];
    unknownFaces: Array<{
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
  }> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/face-recognition/recognize-base64',
      { imageData }
    );
    return response.data.data;
  }

  static async getFaceRecords(
    page: number = 1,
    limit: number = 10,
    filters?: {
      userId?: string;
      faceId?: string;
    }
  ): Promise<PaginatedResponse<FaceRecord>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<FaceRecord>>>(
      '/face-recognition/records',
      { params: { page, limit, ...filters } }
    );
    return response.data.data;
  }

  static async getFaceRecord(id: string): Promise<FaceRecord> {
    const response = await apiClient.get<ApiResponse<FaceRecord>>(
      `/face-recognition/records/${id}`
    );
    return response.data.data;
  }

  static async updateFaceRecord(id: string, updateData: any): Promise<FaceRecord> {
    const response = await apiClient.put<ApiResponse<FaceRecord>>(
      `/face-recognition/records/${id}`,
      updateData
    );
    return response.data.data;
  }

  static async deleteFaceRecord(id: string): Promise<void> {
    await apiClient.delete(`/face-recognition/records/${id}`);
  }

  static async getEvents(
    page: number = 1,
    limit: number = 10,
    filters?: {
      faceRecordId?: string;
      faceId?: string;
      eventType?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<FaceRecognitionEvent>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<FaceRecognitionEvent>>>(
      '/face-recognition/events',
      { params: { page, limit, ...filters } }
    );
    return response.data.data;
  }

  static async getStats(): Promise<FaceRecognitionStats> {
    const response = await apiClient.get<ApiResponse<FaceRecognitionStats>>(
      '/face-recognition/stats'
    );
    return response.data.data;
  }

  static async testConnection(): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/face-recognition/test-connection'
    );
    return response.data.data;
  }

  static async captureSnapshot(cameraId?: string): Promise<{
    success: boolean;
    imageData?: string;
    error?: string;
  }> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/face-recognition/snapshot',
      {},
      { params: { cameraId } }
    );
    return response.data.data;
  }
}
```

### 4.2. File Upload Service
```typescript
// src/services/api/upload.service.ts
import { apiClient } from './client';

export class UploadService {
  static async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  static async uploadFaceImage(file: File): Promise<{
    imageData: string;
    faceData: string;
    confidence: number;
  }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post('/face-recognition/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  static getBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
}
```

## 5. Real-time Communication

### 5.1. WebSocket Service
```typescript
// src/services/websocket.service.ts
import { EventEmitter } from 'events';

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor(private url: string) {
    super();
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.reconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.emit('disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  send(data: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Global WebSocket instance
export const websocketService = new WebSocketService(
  process.env.REACT_APP_WS_URL || 'ws://localhost:3000'
);
```

### 5.2. Real-time Hook
```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { websocketService } from '../services/websocket.service';

export function useWebSocket(event: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleEvent = (data: any) => {
      callbackRef.current(data);
    };

    websocketService.on(event, handleEvent);

    return () => {
      websocketService.off(event, handleEvent);
    };
  }, [event]);

  useEffect(() => {
    if (!websocketService.getConnectionStatus()) {
      websocketService.connect();
    }

    return () => {
      // Don't disconnect on unmount to maintain connection
    };
  }, []);
}

export function useFaceRecognitionEvents() {
  const [events, setEvents] = useState<any[]>([]);

  useWebSocket('face_recognition_event', (data) => {
    setEvents(prev => [data, ...prev.slice(0, 99)]); // Keep last 100 events
  });

  return { events, clearEvents: () => setEvents([]) };
}
```

## 6. Error Handling and Retry Logic

### 6.1. Error Handler
```typescript
// src/services/errorHandler.ts
import { toast } from 'react-toastify';

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export class ErrorHandler {
  static handle(error: any): void {
    if (error.response) {
      // Server responded with error status
      const serverError = error.response.data as ApiError;
      this.handleApiError(serverError);
    } else if (error.request) {
      // Request made but no response received
      this.handleNetworkError(error);
    } else {
      // Something happened in setting up the request
      this.handleUnknownError(error);
    }
  }

  private static handleApiError(error: ApiError): void {
    switch (error.statusCode) {
      case 400:
        if (error.errors) {
          Object.values(error.errors).forEach(messages => {
            messages.forEach(message => toast.error(message));
          });
        } else {
          toast.error(error.message || 'Bad request');
        }
        break;
      case 401:
        toast.error('Unauthorized. Please login again.');
        this.handleAuthError();
        break;
      case 403:
        toast.error('You don\'t have permission to perform this action.');
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 422:
        toast.error('Validation error. Please check your input.');
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(error.message || 'An error occurred');
    }
  }

  private static handleNetworkError(error: any): void {
    toast.error('Network error. Please check your internet connection.');
  }

  private static handleUnknownError(error: any): void {
    toast.error('An unexpected error occurred.');
  }

  private static handleAuthError(): void {
    // Clear auth tokens and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  static retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let retries = 0;

      const attempt = () => {
        fn()
          .then(resolve)
          .catch((error) => {
            retries++;
            if (retries >= maxRetries) {
              reject(error);
            } else {
              setTimeout(attempt, delay * retries);
            }
          });
      };

      attempt();
    });
  }
}
```

## 7. Caching Strategy

### 7.1. Cache Service
```typescript
// src/services/cache.service.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

export const cacheService = new CacheService();
```

### 7.2. Cached API Hook
```typescript
// src/hooks/useCachedApi.ts
import { useState, useEffect } from 'react';
import { cacheService } from '../services/cache.service';

export function useCachedApi<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (forceRefresh = false) => {
    if (!forceRefresh && cacheService.has(key)) {
      setData(cacheService.get<T>(key)!);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchFn();
      setData(response);
      cacheService.set(key, response, ttl);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [key]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
  };
}
```

This comprehensive API integration specification provides a robust foundation for connecting the frontend to the backend API with proper error handling, caching, real-time updates, and type safety.