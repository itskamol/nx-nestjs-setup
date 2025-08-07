import { apiClient } from './client';
import {
  ApiResponse,
  CreateUserRequest,
  PaginatedResponse,
  UpdateUserRequest,
  User,
  UsersQueryParams,
} from '../../types/api';

export class UsersService {
  static async getUsers(params?: UsersQueryParams): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<User>>>('/users', {
      params,
    });
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
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/activate`);
    return response.data.data;
  }

  static async deactivateUser(id: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/deactivate`);
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
