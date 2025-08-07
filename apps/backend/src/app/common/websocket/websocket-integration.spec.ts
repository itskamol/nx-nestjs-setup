import { Test, TestingModule } from '@nestjs/testing';
import { FaceRecognitionWebSocketGateway } from './face-recognition.gateway';
import { WebSocketEventService } from './websocket-event.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FaceRecognitionService } from '../../face-recognition/services/face-recognition.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../database/prisma.service';
import { WebSocketEventType } from '@shared/types/websocket';

// Mock Socket class
class MockSocket {
  public id: string;
  public handshake: any;
  public disconnected: boolean = false;
  public emitted: any[] = [];

  constructor(id: string, auth?: any) {
    this.id = id;
    this.handshake = { auth };
  }

  emit(event: string, data?: any) {
    this.emitted.push({ event, data });
    return true;
  }

  disconnect() {
    this.disconnected = true;
  }

  join(_room: string) {
    // Mock implementation
  }

  leave(_room: string) {
    // Mock implementation
  }
}

// Mock Server class
class MockServer {
  public clients: Map<string, MockSocket> = new Map();
  public emitted: any[] = [];

  constructor() {
    // Mock server methods
  }

  emit(event: string, data?: any) {
    this.emitted.push({ event, data });
    return this;
  }

  of(_namespace: string) {
    return this;
  }
}

describe.skip('WebSocket Gateway Integration', () => {
  let gateway: FaceRecognitionWebSocketGateway;
  let eventService: WebSocketEventService;
  let jwtService: JwtService;
  let mockServer: MockServer;
  let mockSocket: MockSocket;

  beforeEach(async () => {
    mockServer = new MockServer();
    mockSocket = new MockSocket('test-socket-1', { token: 'valid-jwt-token' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaceRecognitionWebSocketGateway,
        WebSocketEventService,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({
              sub: 'test-user-id',
              email: 'test@example.com',
              role: 'USER',
            }),
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
    jwtService = module.get<JwtService>(JwtService);

    // Manually set the server property since it's normally set by NestJS
    (gateway as any).server = mockServer;
    (gateway as any).clients = new Map();
    (gateway as any).clientSockets = new Map();
  });

  it('should handle client connection', async () => {
    await gateway.handleConnection(mockSocket as any);

    expect(gateway.getClientCount()).toBe(1);
    expect(gateway.isClientConnected('test-socket-1')).toBe(true);
  });

  it('should handle client disconnection', async () => {
    await gateway.handleConnection(mockSocket as any);
    expect(gateway.getClientCount()).toBe(1);

    await gateway.handleDisconnect(mockSocket as any);
    expect(gateway.getClientCount()).toBe(0);
    expect(gateway.isClientConnected('test-socket-1')).toBe(false);
  });

  it('should handle authentication', async () => {
    const authSocket = new MockSocket('auth-socket-1');

    await gateway.handleAuthenticate(authSocket as any, 'valid-jwt-token');

    expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt-token', { secret: 'test-secret' });
  });

  it('should handle subscription to events', async () => {
    await gateway.handleConnection(mockSocket as any);

    const subscription = {
      events: [WebSocketEventType.FACE_RECOGNITION, WebSocketEventType.USER_UPDATE],
    };

    await gateway.handleSubscribe(mockSocket as any, subscription);

    // Check if the client received subscription confirmation
    const subscribeMessage = mockSocket.emitted.find(e => e.event === 'subscribed');
    expect(subscribeMessage).toBeDefined();
    expect(subscribeMessage.data.events).toEqual(['FACE_RECOGNITION', 'USER_UPDATE']);
  });

  it('should handle heartbeat', async () => {
    await gateway.handleConnection(mockSocket as any);

    await gateway.handleHeartbeat(mockSocket as any);

    const heartbeatMessage = mockSocket.emitted.find(e => e.event === 'heartbeat');
    expect(heartbeatMessage).toBeDefined();
    expect(heartbeatMessage.data.clientId).toBe('test-socket-1');
  });

  it('should broadcast face recognition events', async () => {
    await gateway.handleConnection(mockSocket as any);

    await gateway.broadcastToAll(WebSocketEventType.FACE_RECOGNITION, {
      eventId: 'test-event',
      eventType: 'RECOGNITION_EVENT',
      faceId: 'test-face',
      confidence: 0.95,
      timestamp: new Date().toISOString(),
      recognitionTime: Date.now(),
    });

    // Check if the message was sent to the client
    const message = mockSocket.emitted.find(e => e.event === 'message');
    expect(message).toBeDefined();
    expect(message.data.type).toBe('FACE_RECOGNITION');
  });

  it('should filter messages based on subscriptions', async () => {
    await gateway.handleConnection(mockSocket as any);

    // Subscribe only to USER_UPDATE events
    await gateway.handleSubscribe(mockSocket as any, {
      events: [WebSocketEventType.USER_UPDATE],
    });

    // Broadcast face recognition event
    await gateway.broadcastToAll(WebSocketEventType.FACE_RECOGNITION, {
      eventId: 'test-event',
      eventType: 'RECOGNITION_EVENT',
      faceId: 'test-face',
      confidence: 0.95,
      timestamp: new Date().toISOString(),
      recognitionTime: Date.now(),
    });

    // The client should not receive the face recognition event
    const faceRecognitionMessage = mockSocket.emitted.find(
      e => e.event === 'message' && e.data.type === 'FACE_RECOGNITION'
    );
    expect(faceRecognitionMessage).toBeUndefined();

    // Broadcast user update event
    await gateway.broadcastToAll(WebSocketEventType.USER_UPDATE, {
      userId: 'test-user',
      updateType: 'UPDATED',
      userData: { id: 'test-user', email: 'test@example.com', role: 'USER', isActive: true },
      timestamp: new Date().toISOString(),
    });

    // The client should receive the user update event
    const userUpdateMessage = mockSocket.emitted.find(
      e => e.event === 'message' && e.data.type === 'USER_UPDATE'
    );
    expect(userUpdateMessage).toBeDefined();
  });
});
