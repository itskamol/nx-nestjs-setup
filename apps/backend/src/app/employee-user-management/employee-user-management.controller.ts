import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { EmployeeUserManagementService } from './employee-user-management.service';
import {
  SearchUserInfoRequestDto,
  SetUpUserRequestDto,
  CreateUserRequestDto,
  ModifyUserRequestDto,
  DeleteUserRequestDto,
  GetUserInfoCapabilitiesResponseDto,
  GetUserInfoCountResponseDto,
  SearchUserInfoResponseDto,
  GetDeleteProcessResponseDto,
  GenericResponseDto,
} from './dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Employee User Management')
@Controller('employee-user-management')
export class EmployeeUserManagementController {
  constructor(
    private readonly employeeUserManagementService: EmployeeUserManagementService,
  ) {}

  @Get('capabilities')
  @ApiOperation({ summary: 'Get device capabilities for person management' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved capabilities.', type: GetUserInfoCapabilitiesResponseDto })
  getCapabilities(): Promise<GetUserInfoCapabilitiesResponseDto> {
    return this.employeeUserManagementService.getCapabilities();
  }

  @Get('count')
  @ApiOperation({ summary: 'Get the total number of persons' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user count.', type: GetUserInfoCountResponseDto })
  getCount(): Promise<GetUserInfoCountResponseDto> {
    return this.employeeUserManagementService.getCount();
  }

  @Post('search')
  @ApiOperation({ summary: 'Search for person information' })
  @ApiResponse({ status: 200, description: 'Successfully performed search.', type: SearchUserInfoResponseDto })
  search(@Body() searchDto: SearchUserInfoRequestDto): Promise<SearchUserInfoResponseDto> {
    return this.employeeUserManagementService.search(searchDto);
  }

  @Put('setup')
  @ApiOperation({ summary: 'Create or update a person (upsert)' })
  @ApiResponse({ status: 200, description: 'Successfully set up user.', type: GenericResponseDto })
  setUp(@Body() setUpDto: SetUpUserRequestDto): Promise<GenericResponseDto> {
    return this.employeeUserManagementService.setUp(setUpDto);
  }

  @Post('record')
  @ApiOperation({ summary: 'Add a new person' })
  @ApiResponse({ status: 201, description: 'Successfully created user.', type: GenericResponseDto })
  create(@Body() createDto: CreateUserRequestDto): Promise<GenericResponseDto> {
    return this.employeeUserManagementService.create(createDto);
  }

  @Put('modify')
  @ApiOperation({ summary: 'Edit an existing person' })
  @ApiResponse({ status: 200, description: 'Successfully modified user.', type: GenericResponseDto })
  modify(@Body() modifyDto: ModifyUserRequestDto): Promise<GenericResponseDto> {
    return this.employeeUserManagementService.modify(modifyDto);
  }

  @Put('delete')
  @ApiOperation({ summary: 'Delete one or more persons' })
  @ApiResponse({ status: 200, description: 'Successfully initiated deletion process.', type: GenericResponseDto })
  delete(@Body() deleteDto: DeleteUserRequestDto): Promise<GenericResponseDto> {
    return this.employeeUserManagementService.delete(deleteDto);
  }

  @Get('delete-process')
  @ApiOperation({ summary: 'Check the progress of a deletion task' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved deletion progress.', type: GetDeleteProcessResponseDto })
  getDeleteProcess(): Promise<GetDeleteProcessResponseDto> {
    return this.employeeUserManagementService.getDeleteProcess();
  }
}
