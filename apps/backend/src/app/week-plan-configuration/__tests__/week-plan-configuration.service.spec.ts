import { Test, TestingModule } from '@nestjs/testing';
import { WeekPlanConfigurationService } from '../week-plan-configuration.service';
import { HikvisionHttpService } from '../../hikvision/hikvision-http.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

const mockHikvisionHttpService = {
  get: jest.fn(),
  put: jest.fn(),
};

describe('WeekPlanConfigurationService', () => {
  let service: WeekPlanConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule.forRoot({
        load: [() => ({ app: { faceRecognition: { hikvision: {} } } })]
      })],
      providers: [
        WeekPlanConfigurationService,
        HikvisionHttpService,
      ],
    })
    .overrideProvider(HikvisionHttpService)
    .useValue(mockHikvisionHttpService)
    .compile();

    service = module.get<WeekPlanConfigurationService>(WeekPlanConfigurationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get door status capabilities', async () => {
    await service.getDoorStatusCapabilities();
    expect(mockHikvisionHttpService.get).toHaveBeenCalledWith('/ISAPI/AccessControl/DoorStatusWeekPlanCfg/capabilities');
  });

  it('should update door status plan', async () => {
    const dto = { enable: true, WeekPlanCfg: [] };
    await service.updateDoorStatusPlan('1', dto as any);
    expect(mockHikvisionHttpService.put).toHaveBeenCalledWith('/ISAPI/AccessControl/DoorStatusWeekPlanCfg/1', { DoorStatusWeekPlanCfg: dto });
  });

  it('should update verify plan', async () => {
    const dto = { enable: true, WeekPlanCfg: [] };
    await service.updateVerifyPlan('1', dto as any);
    expect(mockHikvisionHttpService.put).toHaveBeenCalledWith('/ISAPI/AccessControl/VerifyWeekPlanCfg/1', { VerifyWeekPlanCfg: dto });
  });

  it('should update user right plan', async () => {
    const dto = { enable: true, WeekPlanCfg: [] };
    await service.updateUserRightPlan('1', dto as any);
    expect(mockHikvisionHttpService.put).toHaveBeenCalledWith('/ISAPI/AccessControl/UserRightWeekPlanCfg/1', { UserRightWeekPlanCfg: dto });
  });

  it('should update attendance plan', async () => {
    const dto = { enable: true, WeekPlanCfg: [] };
    await service.updateAttendancePlan('1', dto as any);
    expect(mockHikvisionHttpService.put).toHaveBeenCalledWith('/ISAPI/AccessControl/Attendance/weekPlan/1', { AttendanceWeekPlan: dto });
  });
});
