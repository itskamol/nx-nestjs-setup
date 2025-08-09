import { Injectable } from '@nestjs/common';
import { HikvisionHttpService } from '../hikvision/hikvision-http.service';
import {
  GetDoorStatusWeekPlanCapabilitiesDto,
  UpdateDoorStatusWeekPlanDto,
  UpdateVerifyWeekPlanDto,
  UpdateUserRightWeekPlanDto,
  UpdateAttendanceWeekPlanDto,
  GenericResponseDto,
} from './dto';

@Injectable()
export class WeekPlanConfigurationService {
  constructor(private readonly hikvisionHttpService: HikvisionHttpService) {}

  async getDoorStatusCapabilities(): Promise<GetDoorStatusWeekPlanCapabilitiesDto> {
    return this.hikvisionHttpService.get<GetDoorStatusWeekPlanCapabilitiesDto>(
      '/ISAPI/AccessControl/DoorStatusWeekPlanCfg/capabilities',
    );
  }

  async updateDoorStatusPlan(
    weekPlanID: string,
    dto: UpdateDoorStatusWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      `/ISAPI/AccessControl/DoorStatusWeekPlanCfg/${weekPlanID}`,
      { DoorStatusWeekPlanCfg: dto },
    );
  }

  async updateVerifyPlan(
    weekPlanID: string,
    dto: UpdateVerifyWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      `/ISAPI/AccessControl/VerifyWeekPlanCfg/${weekPlanID}`,
      { VerifyWeekPlanCfg: dto },
    );
  }

  async updateUserRightPlan(
    weekPlanID: string,
    dto: UpdateUserRightWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      `/ISAPI/AccessControl/UserRightWeekPlanCfg/${weekPlanID}`,
      { UserRightWeekPlanCfg: dto },
    );
  }

  async updateAttendancePlan(
    planNo: string,
    dto: UpdateAttendanceWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.hikvisionHttpService.put<GenericResponseDto>(
      `/ISAPI/AccessControl/Attendance/weekPlan/${planNo}`,
      { AttendanceWeekPlan: dto },
    );
  }
}
