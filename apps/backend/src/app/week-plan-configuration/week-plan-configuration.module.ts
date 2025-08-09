import { Module } from '@nestjs/common';
import { WeekPlanConfigurationController } from './week-plan-configuration.controller';
import { WeekPlanConfigurationService } from './week-plan-configuration.service';
import { HikvisionModule } from '../hikvision/hikvision.module';

@Module({
  imports: [HikvisionModule],
  controllers: [WeekPlanConfigurationController],
  providers: [WeekPlanConfigurationService],
})
export class WeekPlanConfigurationModule {}
