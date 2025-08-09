import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsInt, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';

// Common
class TimeSegmentDto {
    @ApiProperty({ description: 'Start time in HH:mm:ss format', example: '09:00:00' })
    @IsString()
    beginTime: string;

    @ApiProperty({ description: 'End time in HH:mm:ss format', example: '17:00:00' })
    @IsString()
    endTime: string;
}

class WeekPlanCfgBaseDto {
    @ApiProperty({ description: 'Day of the week', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] })
    @IsEnum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    week: string;

    @ApiProperty({ description: 'Time period number (1-8)', example: 1 })
    @IsInt()
    id: number;

    @ApiProperty({ description: 'Enable or disable this time segment', example: true })
    @IsBoolean()
    enable: boolean;

    @ApiProperty({ description: 'The time range for this rule' })
    @ValidateNested()
    @Type(() => TimeSegmentDto)
    TimeSegment: TimeSegmentDto;
}


// GET /ISAPI/AccessControl/DoorStatusWeekPlanCfg/capabilities
class PlanNoCapDto {
    @ApiProperty({ example: 1 })
    '@min': number;
    @ApiProperty({ example: 4 })
    '@max': number;
}
class WeekPlanCfgCapDto {
    @ApiProperty({ example: 56 })
    maxSize: number;
}
class DoorStatusWeekPlanCfgCap {
    @ApiProperty()
    @ValidateNested()
    @Type(() => PlanNoCapDto)
    planNo: PlanNoCapDto;

    @ApiProperty()
    @ValidateNested()
    @Type(() => WeekPlanCfgCapDto)
    'WeekPlanCfg.maxSize': WeekPlanCfgCapDto
}
export class GetDoorStatusWeekPlanCapabilitiesDto {
    @ApiProperty()
    @ValidateNested()
    @Type(() => DoorStatusWeekPlanCfgCap)
    DoorStatusWeekPlanCfg: DoorStatusWeekPlanCfgCap;
}


// PUT /ISAPI/AccessControl/DoorStatusWeekPlanCfg/<weekPlanID>
class DoorStatusWeekPlanCfgDto extends WeekPlanCfgBaseDto {
    @ApiProperty({ description: 'The desired door status', enum: ['remainOpen', 'remainClosed', 'normal'] })
    @IsEnum(['remainOpen', 'remainClosed', 'normal'])
    doorStatus: string;
}
export class UpdateDoorStatusWeekPlanDto {
    @ApiProperty({ description: 'Enable or disable this week plan' })
    @IsBoolean()
    enable: boolean;

    @ApiProperty({ type: [DoorStatusWeekPlanCfgDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DoorStatusWeekPlanCfgDto)
    WeekPlanCfg: DoorStatusWeekPlanCfgDto[];
}


// PUT /ISAPI/AccessControl/VerifyWeekPlanCfg/<weekPlanID>
class VerifyWeekPlanCfgDto extends WeekPlanCfgBaseDto {
    @ApiProperty({ description: 'Authentication mode', enum: ['cardAndPw', 'card', 'cardOrPw', 'fp', 'face', 'faceAndCard'] })
    @IsEnum(['cardAndPw', 'card', 'cardOrPw', 'fp', 'face', 'faceAndCard'])
    verifyMode: string;
}
export class UpdateVerifyWeekPlanDto {
    @ApiProperty({ description: 'Enable or disable this plan' })
    @IsBoolean()
    enable: boolean;

    @ApiProperty({ type: [VerifyWeekPlanCfgDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VerifyWeekPlanCfgDto)
    WeekPlanCfg: VerifyWeekPlanCfgDto[];
}


// PUT /ISAPI/AccessControl/UserRightWeekPlanCfg/<weekPlanID>
class UserRightWeekPlanCfgDto extends WeekPlanCfgBaseDto {}
export class UpdateUserRightWeekPlanDto {
    @ApiProperty({ description: 'Enable or disable this plan' })
    @IsBoolean()
    enable: boolean;

    @ApiProperty({ type: [UserRightWeekPlanCfgDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserRightWeekPlanCfgDto)
    WeekPlanCfg: UserRightWeekPlanCfgDto[];
}

// PUT /ISAPI/AccessControl/Attendance/weekPlan/<PlanNo>
class AttendanceWeekPlanCfgDto extends WeekPlanCfgBaseDto {}
export class UpdateAttendanceWeekPlanDto {
    @ApiProperty({ description: 'Enable or disable this plan' })
    @IsBoolean()
    enable: boolean;

    @ApiProperty({ type: [AttendanceWeekPlanCfgDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttendanceWeekPlanCfgDto)
    WeekPlanCfg: AttendanceWeekPlanCfgDto[];
}

// Generic Response
export class GenericResponseDto {
    @ApiProperty({ description: 'Indicates success (1) or failure.', example: 1 })
    @IsInt()
    statusCode: number;
}
