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

describe('FaceRecognitionController (e2e)', () => {
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

    describe('POST /api/face-recognition/record', () => {
        it('should create a face record with valid data', async () => {
            const faceDataRecord = { faceLibType: 'staticFD', FDID: '1', employeeNo: '101' };
            mockHikvisionHttpService.post.mockResolvedValue({ FPID: 'new-face-id' });

            await request(app.getHttpServer())
                .post('/api/face-recognition/record')
                .set(adminHeaders)
                .field('FaceDataRecord', JSON.stringify(faceDataRecord))
                .attach('FacePicture', Buffer.from('test'), 'test.jpg')
                .expect(201);

            expect(mockHikvisionHttpService.post).toHaveBeenCalled();
        });
    });
});
