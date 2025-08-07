import { apiClient } from './client';
import {
  ApiResponse,
  CreateFaceRecordRequest,
  FaceRecognitionEvent,
  FaceRecognitionStats,
  FaceRecord,
  PaginatedResponse,
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
    const response = await apiClient.post<ApiResponse<any>>('/face-recognition/recognize-base64', {
      imageData,
    });
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
      cameraLocation?: string;
      riskLevel?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<FaceRecognitionEvent>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<FaceRecognitionEvent>>>(
      '/face-recognition/events',
      { params: { page, limit, ...filters } }
    );
    return response.data.data;
  }

  static async getEventsWithFilters(filters?: {
    eventType?: string;
    cameraLocation?: string;
    riskLevel?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FaceRecognitionEvent[]> {
    const response = await apiClient.get<ApiResponse<FaceRecognitionEvent[]>>(
      '/face-recognition/events/all',
      { params: filters }
    );
    return response.data.data;
  }

  static async getStats(): Promise<FaceRecognitionStats> {
    const response =
      await apiClient.get<ApiResponse<FaceRecognitionStats>>('/face-recognition/stats');
    return response.data.data;
  }

  static async testConnection(): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<ApiResponse<any>>('/face-recognition/test-connection');
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
