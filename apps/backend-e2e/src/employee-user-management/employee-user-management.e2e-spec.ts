import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../backend/src/app/app.module';
import { AuthUtils } from '../utils/auth-utils';
import { HikvisionHttpService } from '../../../backend/src/app/hikvision/hikvision-http.service';

const mockHikvisionHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
};

describe('EmployeeUserManagementController (e2e)', () => {
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

    describe('GET /api/employee-user-management/capabilities', () => {
        it('should call the service and return a 200', async () => {
            mockHikvisionHttpService.get.mockResolvedValue({ UserInfo: { maxRecordNum: 5000, supportFunction: 'get,post' } });
            await request(app.getHttpServer())
                .get('/api/employee-user-management/capabilities')
                .set(adminHeaders)
                .expect(200);
            expect(mockHikvisionHttpService.get).toHaveBeenCalledWith('/ISAPI/AccessControl/UserInfo/capabilities');
        });
    });

    describe('POST /api/employee-user-management/search', () => {
        it('should fail with an invalid DTO', async () => {
            await request(app.getHttpServer())
                .post('/api/employee-user-management/search')
                .set(adminHeaders)
                .send({ UserInfoSearchCond: {} }) // Missing required fields
                .expect(400);
        });

        it('should call the service with a valid DTO', async () => {
            const searchDto = { UserInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 10 } };
            mockHikvisionHttpService.post.mockResolvedValue({});
            await request(app.getHttpServer())
                .post('/api/employee-user-management/search')
                .set(adminHeaders)
                .send(searchDto)
                .expect(201); // The controller has @Post, so it returns 201
            expect(mockHikvisionHttpService.post).toHaveBeenCalledWith('/ISAPI/AccessControl/UserInfo/Search', searchDto);
        });
    });
});
