import { Injectable } from '@nestjs/common';
import { HikvisionHttpService } from '../../hikvision/hikvision-http.service';
import {
  GetFaceLibCapabilitiesResponseDto,
  SearchFaceRequestDto,
  SearchFaceResponseDto,
  CreateFaceRecordDto,
  CreateFaceRecordResponseDto,
  ModifyFaceRecordDto,
  DeleteFaceRequestDto,
  GenericResponseDto,
} from '../dto';
import FormData from 'form-data';

@Injectable()
export class FaceRecognitionService {
  constructor(private readonly hikvisionHttpService: HikvisionHttpService) {}

  async getCapabilities(): Promise<GetFaceLibCapabilitiesResponseDto> {
    return this.hikvisionHttpService.get<GetFaceLibCapabilitiesResponseDto>(
      '/ISAPI/Intelligent/FDLib/capabilities',
    );
  }

  async search(
    searchDto: SearchFaceRequestDto,
  ): Promise<SearchFaceResponseDto> {
    return this.hikvisionHttpService.post<SearchFaceResponseDto>(
      '/ISAPI/Intelligent/FDLib/FDSearch',
      searchDto,
    );
  }

  async createRecord(
    createDto: CreateFaceRecordDto,
    facePicture: Express.Multer.File,
  ): Promise<CreateFaceRecordResponseDto> {
    const formData = new FormData();
    formData.append('FaceDataRecord', JSON.stringify(createDto.FaceDataRecord), {
      contentType: 'application/json',
    });
    formData.append('FacePicture', facePicture.buffer, {
      filename: facePicture.originalname,
      contentType: facePicture.mimetype,
    });

    return this.hikvisionHttpService.post<CreateFaceRecordResponseDto>(
      '/ISAPI/Intelligent/FDLib/FaceDataRecord',
      formData,
      { headers: formData.getHeaders() },
    );
  }

  async modifyRecord(
    modifyDto: ModifyFaceRecordDto,
    facePicture?: Express.Multer.File,
  ): Promise<GenericResponseDto> {
    const formData = new FormData();
    formData.append('FaceDataRecord', JSON.stringify(modifyDto.FaceDataRecord), {
      contentType: 'application/json',
    });
    if (facePicture) {
      formData.append('FacePicture', facePicture.buffer, {
        filename: facePicture.originalname,
        contentType: facePicture.mimetype,
      });
    }

    return this.hikvisionHttpService.put<GenericResponseDto>(
      '/ISAPI/Intelligent/FDLib/FDModify',
      formData,
      { headers: formData.getHeaders() },
    );
  }

  async delete(
    deleteDto: DeleteFaceRequestDto,
  ): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      '/ISAPI/Intelligent/FDLib/FDSearch/Delete',
      deleteDto,
    );
  }

  // TODO: This is a dummy method to satisfy a dependency from an old implementation.
  // This should be removed and the calling code refactored.
  async getStats(): Promise<any> {
      return Promise.resolve({});
  }
}
