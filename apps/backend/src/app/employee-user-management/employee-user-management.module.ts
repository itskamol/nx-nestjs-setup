import { Module } from '@nestjs/common';
import { EmployeeUserManagementController } from './employee-user-management.controller';
import { EmployeeUserManagementService } from './employee-user-management.service';
import { HikvisionModule } from '../hikvision/hikvision.module';

@Module({
  imports: [HikvisionModule],
  controllers: [EmployeeUserManagementController],
  providers: [EmployeeUserManagementService],
})
export class EmployeeUserManagementModule {}
