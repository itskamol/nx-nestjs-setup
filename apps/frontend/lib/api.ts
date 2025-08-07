const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;

    // Initialize token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.clearAuth();
          window.location.href = '/login';
          throw new Error('Authentication failed');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearAuth() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data.accessToken) {
      this.setToken(response.data.accessToken);
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const response = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.data.accessToken) {
      this.setToken(response.data.accessToken);
    }

    return response;
  }

  async refreshToken(refreshToken: string) {
    return this.request<any>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearAuth();
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // User management endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    return this.request<any>(`/users${query ? `?${query}` : ''}`);
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}`);
  }

  async createUser(userData: any) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request<any>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async activateUser(id: string) {
    return this.request<any>(`/users/${id}/activate`, {
      method: 'PATCH',
    });
  }

  async deactivateUser(id: string) {
    return this.request<any>(`/users/${id}/deactivate`, {
      method: 'PATCH',
    });
  }

  // Face recognition endpoints
  async enrollFace(faceData: {
    userId: string;
    faceId: string;
    imageData: string;
    faceData: string;
    confidence: number;
  }) {
    return this.request<any>('/face-recognition/enroll', {
      method: 'POST',
      body: JSON.stringify(faceData),
    });
  }

  async recognizeFace(imageData: string) {
    return this.request<any>('/face-recognition/recognize-base64', {
      method: 'POST',
      body: JSON.stringify({ imageData }),
    });
  }

  async getFaceRecords(params?: {
    userId?: string;
    faceId?: string;
    eventType?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    return this.request<any>(`/face-recognition/records${query ? `?${query}` : ''}`);
  }

  async getFaceRecord(id: string) {
    return this.request<any>(`/face-recognition/records/${id}`);
  }

  async updateFaceRecord(id: string, data: any) {
    return this.request<any>(`/face-recognition/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFaceRecord(id: string) {
    return this.request<any>(`/face-recognition/records/${id}`, {
      method: 'DELETE',
    });
  }

  async getFaceEvents(params?: {
    page?: number;
    limit?: number;
    faceRecordId?: string;
    faceId?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    return this.request<any>(`/face-recognition/events${query ? `?${query}` : ''}`);
  }

  async getFaceStats() {
    return this.request<any>('/face-recognition/stats');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
