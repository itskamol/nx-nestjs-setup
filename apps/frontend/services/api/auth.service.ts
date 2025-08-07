import { apiClient } from './client';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User } from '../../types/api';

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);

    const { accessToken, refreshToken, user, expiresIn, tokenType, permissions } =
      response.data.data;
    apiClient.setTokens(accessToken, refreshToken);
    return { accessToken, refreshToken, user, expiresIn, tokenType, permissions };
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', userData);

    const { accessToken, refreshToken, user, expiresIn, tokenType, permissions } =
      response.data.data;
    apiClient.setTokens(accessToken, refreshToken);
    return { accessToken, refreshToken, user, expiresIn, tokenType, permissions };
  }

  static async refreshToken(): Promise<AuthResponse> {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', {
      refreshToken,
    });

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
      expiresIn,
      tokenType,
      permissions,
    } = response.data.data;
    apiClient.setTokens(accessToken, newRefreshToken);
    return { accessToken, refreshToken: newRefreshToken, user, expiresIn, tokenType, permissions };
  }

  static async logout(): Promise<void> {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
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
    return typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;
  }

  static getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }

  static getUserFromToken(): User | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user;
    } catch {
      return null;
    }
  }
}
