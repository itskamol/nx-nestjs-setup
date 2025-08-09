import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../backend/src/app/app.module';
import { AuthUtils } from '../utils/auth-utils';
import { HikvisionHttpService } from '../../../backend/src/app/hikvision/hikvision-http.service';

const mockHikvisionHttpService = {
    get: jest.fn(),
    put: jest.fn(),
};

describe('WeekPlanConfigurationController (e2e)', () => {
    let app: INestApplication;
    let authUtils: AuthUtils;
    let adminHeaders: Record<string, string>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideProvider(HikvisionHttpService)
        .useValue(mockHikvisionHttpService)
        .compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();

        authUtils = new AuthUtils();
        const headers = await authUtils.createAuthHeadersForRoles();
        adminHeaders = headers.adminHeaders;
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/week-plan-configuration/door-status/capabilities', () => {
        it('should call the service and return a 200', async () => {
            mockHikvisionHttpService.get.mockResolvedValue({});
            await request(app.getHttpServer())
                .get('/api/week-plan-configuration/door-status/capabilities')
                .set(adminHeaders)
                .expect(200);
            expect(mockHikvisionHttpService.get).toHaveBeenCalledWith('/ISAPI/AccessControl/DoorStatusWeekPlanCfg/capabilities');
        });
    });

    describe('PUT /api/week-plan-configuration/door-status/:weekPlanID', () => {
        it('should fail with an invalid DTO', async () => {
            await request(app.getHttpServer())
                .put('/api/week-plan-configuration/door-status/1')
                .set(adminHeaders)
                .send({ enable: 'not-a-boolean' })
                .expect(400);
        });

        it('should call the service with a valid DTO', async () => {
            const dto = { enable: true, WeekPlanCfg: [] };
            mockHikvisionHttpService.put.mockResolvedValue({});
            await request(app.getHttpServer())
                .put('/api/week-plan-configuration/door-status/1')
                .set(adminHeaders)
                .send(dto)
                .expect(200);
            expect(mockHikvisionHttpService.put).toHaveBeenCalledWith('/ISAPI/AccessControl/DoorStatusWeekPlanCfg/1', { DoorStatusWeekPlanCfg: dto });
        });
    });
});
