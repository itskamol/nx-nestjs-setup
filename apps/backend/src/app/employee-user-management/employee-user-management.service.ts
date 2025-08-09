import { Injectable } from '@nestjs/common';
import { HikvisionHttpService } from '../hikvision/hikvision-http.service';
import {
  DeleteUserRequestDto,
  GetDeleteProcessResponseDto,
  GetUserInfoCapabilitiesResponseDto,
  GetUserInfoCountResponseDto,
  ModifyUserRequestDto,
  SearchUserInfoRequestDto,
  SearchUserInfoResponseDto,
  SetUpUserRequestDto,
  CreateUserRequestDto,
  GenericResponseDto,
} from './dto';

@Injectable()
export class EmployeeUserManagementService {
  constructor(private readonly hikvisionHttpService: HikvisionHttpService) {}

  async getCapabilities(): Promise<GetUserInfoCapabilitiesResponseDto> {
    return this.hikvisionHttpService.get<GetUserInfoCapabilitiesResponseDto>(
      '/ISAPI/AccessControl/UserInfo/capabilities',
    );
  }

  async getCount(): Promise<GetUserInfoCountResponseDto> {
    return this.hikvisionHttpService.get<GetUserInfoCountResponseDto>(
      '/ISAPI/AccessControl/UserInfo/Count',
    );
  }

  async search(
    searchDto: SearchUserInfoRequestDto,
  ): Promise<SearchUserInfoResponseDto> {
    return this.hikvisionHttpService.post<SearchUserInfoResponseDto>(
      '/ISAPI/AccessControl/UserInfo/Search',
      searchDto,
    );
  }

  async setUp(setUpDto: SetUpUserRequestDto): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      '/ISAPI/AccessControl/UserInfo/SetUp',
      setUpDto,
    );
  }

  async create(createDto: CreateUserRequestDto): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.post<GenericResponseDto>(
      '/ISAPI/AccessControl/UserInfo/Record',
      createDto,
    );
  }

  async modify(modifyDto: ModifyUserRequestDto): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      '/ISAPI/AccessControl/UserInfo/Modify',
      modifyDto,
    );
  }

  async delete(deleteDto: DeleteUserRequestDto): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      '/ISAPI/AccessControl/UserInfoDetail/Delete',
      deleteDto,
    );
  }

  async getDeleteProcess(): Promise<GetDeleteProcessResponseDto> {
    return this.hikvisionHttpService.get<GetDeleteProcessResponseDto>(
      '/ISAPI/AccessControl/UserInfoDetail/DeleteProcess',
    );
  }
}
