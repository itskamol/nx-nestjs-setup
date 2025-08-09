import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { WeekPlanConfigurationService } from './week-plan-configuration.service';
import {
  GetDoorStatusWeekPlanCapabilitiesDto,
  UpdateDoorStatusWeekPlanDto,
  UpdateVerifyWeekPlanDto,
  UpdateUserRightWeekPlanDto,
  UpdateAttendanceWeekPlanDto,
  GenericResponseDto,
} from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Week Plan Configuration')
@Controller('week-plan-configuration')
export class WeekPlanConfigurationController {
  constructor(
    private readonly weekPlanService: WeekPlanConfigurationService,
  ) {}

  @Get('door-status/capabilities')
  @ApiOperation({ summary: 'Get capabilities for door status weekly schedules' })
  @ApiResponse({ status: 200, type: GetDoorStatusWeekPlanCapabilitiesDto })
  getDoorStatusCapabilities(): Promise<GetDoorStatusWeekPlanCapabilitiesDto> {
    return this.weekPlanService.getDoorStatusCapabilities();
  }

  @Put('door-status/:weekPlanID')
  @ApiOperation({ summary: 'Create or update a door status weekly schedule' })
  @ApiParam({ name: 'weekPlanID', description: 'ID of the week plan' })
  @ApiResponse({ status: 200, type: GenericResponseDto })
  updateDoorStatusPlan(
    @Param('weekPlanID') weekPlanID: string,
    @Body() dto: UpdateDoorStatusWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.weekPlanService.updateDoorStatusPlan(weekPlanID, dto);
  }

  @Put('verify/:weekPlanID')
  @ApiOperation({ summary: 'Create or update a card reader verification weekly schedule' })
  @ApiParam({ name: 'weekPlanID', description: 'ID of the week plan' })
  @ApiResponse({ status: 200, type: GenericResponseDto })
  updateVerifyPlan(
    @Param('weekPlanID') weekPlanID: string,
    @Body() dto: UpdateVerifyWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.weekPlanService.updateVerifyPlan(weekPlanID, dto);
  }

  @Put('user-right/:weekPlanID')
  @ApiOperation({ summary: 'Create or update a user rights weekly schedule' })
  @ApiParam({ name: 'weekPlanID', description: 'ID of the week plan' })
  @ApiResponse({ status: 200, type: GenericResponseDto })
  updateUserRightPlan(
    @Param('weekPlanID') weekPlanID: string,
    @Body() dto: UpdateUserRightWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.weekPlanService.updateUserRightPlan(weekPlanID, dto);
  }

  @Put('attendance/:planNo')
  @ApiOperation({ summary: 'Create or update an attendance weekly schedule' })
  @ApiParam({ name: 'planNo', description: 'Number of the attendance plan' })
  @ApiResponse({ status: 200, type: GenericResponseDto })
  updateAttendancePlan(
    @Param('planNo') planNo: string,
    @Body() dto: UpdateAttendanceWeekPlanDto,
  ): Promise<GenericResponseDto> {
    return this.weekPlanService.updateAttendancePlan(planNo, dto);
  }
}
