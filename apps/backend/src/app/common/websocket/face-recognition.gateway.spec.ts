import { Test, TestingModule } from '@nestjs/testing';
import { FaceRecognitionWebSocketGateway } from './face-recognition.gateway';
import { WebSocketEventService } from './websocket-event.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FaceRecognitionService } from '../../face-recognition/services/face-recognition.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../database/prisma.service';

describe('FaceRecognitionWebSocketGateway', () => {
  let gateway: FaceRecognitionWebSocketGateway;
  let eventService: WebSocketEventService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaceRecognitionWebSocketGateway,
        WebSocketEventService,
        {
          provide: JwtService,
          useValue: {
            verify: jest
              .fn()
              .mockReturnValue({ sub: 'test-user', email: 'test@example.com', role: 'USER' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: FaceRecognitionService,
          useValue: {
            getStats: jest.fn().mockResolvedValue({
              totalRecords: 150,
              activeRecords: 120,
              totalEvents: 2500,
              eventsByType: { DETECTED: 45 },
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 'test-user',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'USER',
              isActive: true,
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<FaceRecognitionWebSocketGateway>(FaceRecognitionWebSocketGateway);
    eventService = module.get<WebSocketEventService>(WebSocketEventService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
    expect(eventService).toBeDefined();
  });

  describe('WebSocket Event Service', () => {
    it('should emit face recognition event', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await eventService.emitFaceRecognized('test-face-id', 0.95, 'test-user', 'camera-1');

      expect(emitSpy).toHaveBeenCalledWith(
        'face.recognition.event',
        expect.objectContaining({
          eventType: 'RECOGNITION_EVENT',
          faceId: 'test-face-id',
          userId: 'test-user',
          confidence: 0.95,
          cameraId: 'camera-1',
        })
      );
    });

    it('should emit unknown face event', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await eventService.emitUnknownFaceDetected('unknown-face-id', 0.85, 'camera-1');

      expect(emitSpy).toHaveBeenCalledWith(
        'face.recognition.event',
        expect.objectContaining({
          eventType: 'UNKNOWN_FACE',
          faceId: 'unknown-face-id',
          confidence: 0.85,
          cameraId: 'camera-1',
        })
      );
    });

    it('should emit user update event', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await eventService.emitUserCreated('test-user');

      expect(emitSpy).toHaveBeenCalledWith(
        'user.updated',
        expect.objectContaining({
          userId: 'test-user',
          updateType: 'CREATED',
        })
      );
    });

    it('should emit system event', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await eventService.emitSystemStart();

      expect(emitSpy).toHaveBeenCalledWith(
        'system.event',
        expect.objectContaining({
          eventType: 'SYSTEM_START',
          severity: 'INFO',
        })
      );
    });
  });

  describe('Gateway Methods', () => {
    it('should get connected clients', () => {
      const clients = gateway.getConnectedClients();
      expect(Array.isArray(clients)).toBe(true);
    });

    it('should get client count', () => {
      const count = gateway.getClientCount();
      expect(typeof count).toBe('number');
    });

    it('should check if client is connected', () => {
      const isConnected = gateway.isClientConnected('test-client');
      expect(typeof isConnected).toBe('boolean');
    });
  });
});
