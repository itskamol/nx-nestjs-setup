import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuthenticatedClient,
  BroadcastOptions,
  SubscriptionRequest,
  WebSocketEventPayload,
  WebSocketEventType,
  WebSocketMessage,
} from '@shared/types/websocket';
import { Role } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/face-recognition',
})
@Injectable()
export class FaceRecognitionWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FaceRecognitionWebSocketGateway.name);
  private readonly clients = new Map<string, AuthenticatedClient>();
  private readonly clientSockets = new Map<string, Socket>();
  private heartbeatInterval: NodeJS.Timeout;
  private redisPublisher: Redis;
  private redisSubscriber: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    };

    // Create separate Redis connections for publishing and subscribing
    this.redisPublisher = new Redis(redisConfig);
    this.redisSubscriber = new Redis(redisConfig);
  }

  async onModuleInit() {
    this.setupEventListeners();
  }

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.startHeartbeat();
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const authenticatedClient: AuthenticatedClient = {
        id: client.id,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        subscriptions: [],
      };

      this.clients.set(client.id, authenticatedClient);
      this.clientSockets.set(client.id, client);

      await this.sendConnectionStatus(client, 'CONNECTED');
      this.broadcastUserUpdate(payload.sub, 'CONNECTED');

      this.logger.log(`Client connected: ${client.id} (${payload.email})`);
    } catch (error) {
      this.logger.error(
        `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const authenticatedClient = this.clients.get(client.id);

    if (authenticatedClient) {
      this.broadcastUserUpdate(authenticatedClient.userId, 'DISCONNECTED');
      this.clients.delete(client.id);
      this.clientSockets.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id} (${authenticatedClient.email})`);
    }
  }

  @SubscribeMessage('authenticate')
  async handleAuthenticate(client: Socket, token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const authenticatedClient: AuthenticatedClient = {
        id: client.id,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        subscriptions: [],
      };

      this.clients.set(client.id, authenticatedClient);
      this.clientSockets.set(client.id, client);

      await this.sendConnectionStatus(client, 'AUTHENTICATED');
      client.emit('authenticated', { success: true, userId: payload.sub });

      this.logger.log(`Client authenticated: ${client.id} (${payload.email})`);
    } catch {
      client.emit('authenticated', { success: false, error: 'Invalid token' });
      client.disconnect();
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, subscription: SubscriptionRequest) {
    const authenticatedClient = this.clients.get(client.id);

    if (!authenticatedClient) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    authenticatedClient.subscriptions = subscription.events;
    authenticatedClient.lastActivity = new Date().toISOString();

    client.emit('subscribed', { events: subscription.events });
    this.logger.log(`Client ${client.id} subscribed to events: ${subscription.events.join(', ')}`);
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(client: Socket, events: WebSocketEventType[]) {
    const authenticatedClient = this.clients.get(client.id);

    if (!authenticatedClient) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    authenticatedClient.subscriptions = authenticatedClient.subscriptions.filter(
      event => !events.includes(event)
    );
    authenticatedClient.lastActivity = new Date().toISOString();

    client.emit('unsubscribed', { events });
    this.logger.log(`Client ${client.id} unsubscribed from events: ${events.join(', ')}`);
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(client: Socket) {
    const authenticatedClient = this.clients.get(client.id);

    if (authenticatedClient) {
      authenticatedClient.lastActivity = new Date().toISOString();
    }

    client.emit('heartbeat', {
      timestamp: new Date().toISOString(),
      clientId: client.id,
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      connectedClients: this.clients.size,
    });
  }

  @SubscribeMessage('ping')
  async handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // Public methods for broadcasting events
  async broadcastToAll<T extends WebSocketEventPayload>(
    type: WebSocketEventType,
    data: T,
    options?: BroadcastOptions
  ) {
    const message: WebSocketMessage<T> = {
      type,
      timestamp: new Date().toISOString(),
      data,
      messageId: this.generateMessageId(),
    };

    const targetClients = this.getTargetClients(options);

    for (const client of targetClients) {
      const socket = this.clientSockets.get(client.id);
      if (socket && this.shouldSendMessage(client, type)) {
        socket.emit('message', message);
      }
    }

    // Also publish to Redis for cross-instance broadcasting
    await this.redisPublisher.publish('websocket:broadcast', JSON.stringify(message));
  }

  async broadcastToUser<T extends WebSocketEventPayload>(
    userId: string,
    type: WebSocketEventType,
    data: T
  ) {
    const message: WebSocketMessage<T> = {
      type,
      timestamp: new Date().toISOString(),
      data,
      messageId: this.generateMessageId(),
    };

    const userClients = Array.from(this.clients.values()).filter(
      client => client.userId === userId
    );

    for (const client of userClients) {
      const socket = this.clientSockets.get(client.id);
      if (socket && this.shouldSendMessage(client, type)) {
        socket.emit('message', message);
      }
    }
  }

  async broadcastToRole<T extends WebSocketEventPayload>(
    role: Role,
    type: WebSocketEventType,
    data: T
  ) {
    const message: WebSocketMessage<T> = {
      type,
      timestamp: new Date().toISOString(),
      data,
      messageId: this.generateMessageId(),
    };

    const roleClients = Array.from(this.clients.values()).filter(client => client.role === role);

    for (const client of roleClients) {
      const socket = this.clientSockets.get(client.id);
      if (socket && this.shouldSendMessage(client, type)) {
        socket.emit('message', message);
      }
    }
  }

  async sendConnectionStatus(
    client: Socket,
    status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'AUTHENTICATED' | 'ERROR'
  ) {
    const message: WebSocketMessage = {
      type: WebSocketEventType.CONNECTION_STATUS,
      timestamp: new Date().toISOString(),
      data: {
        status,
        timestamp: new Date().toISOString(),
        clientId: client.id,
      },
    };

    client.emit('message', message);
  }

  private getTargetClients(options?: BroadcastOptions): AuthenticatedClient[] {
    let clients = Array.from(this.clients.values());

    if (options?.targetRoles) {
      clients = clients.filter(client => options.targetRoles?.includes(client.role as Role));
    }

    if (options?.targetUsers) {
      clients = clients.filter(client => options.targetUsers?.includes(client.userId));
    }

    if (options?.excludeUsers) {
      clients = clients.filter(client => !options.excludeUsers?.includes(client.userId));
    }

    if (options?.filter) {
      clients = clients.filter(options.filter);
    }

    return clients;
  }

  private shouldSendMessage(client: AuthenticatedClient, eventType: WebSocketEventType): boolean {
    return client.subscriptions.length === 0 || client.subscriptions.includes(eventType);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private broadcastUserUpdate(userId: string, status: 'CONNECTED' | 'DISCONNECTED') {
    this.broadcastToAll(WebSocketEventType.USER_UPDATE, {
      userId,
      updateType: status === 'CONNECTED' ? 'UPDATED' : 'UPDATED',
      userData: { id: userId, email: '', role: '', isActive: true },
      timestamp: new Date().toISOString(),
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage: WebSocketMessage = {
        type: WebSocketEventType.HEARTBEAT,
        timestamp: new Date().toISOString(),
        data: {
          timestamp: new Date().toISOString(),
          clientId: 'server',
          serverTime: new Date().toISOString(),
          uptime: process.uptime(),
          connectedClients: this.clients.size,
        },
      };

      this.server.emit('heartbeat', heartbeatMessage.data);
    }, 30000); // 30 seconds
  }

  private setupEventListeners() {
    // Listen for face recognition events from the event emitter
    this.eventEmitter.on('face.recognition.event', data => {
      this.broadcastToAll(WebSocketEventType.FACE_RECOGNITION, data);
    });

    this.eventEmitter.on('user.updated', data => {
      this.broadcastToAll(WebSocketEventType.USER_UPDATE, data);
    });

    this.eventEmitter.on('system.event', data => {
      this.broadcastToAll(WebSocketEventType.SYSTEM_EVENT, data);
    });

    this.eventEmitter.on('statistics.updated', data => {
      this.broadcastToAll(WebSocketEventType.STATISTICS_UPDATE, data);
    });

    // Listen for Redis messages for cross-instance broadcasting
    this.redisSubscriber.subscribe('websocket:broadcast');
    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === 'websocket:broadcast') {
        try {
          const parsedMessage: WebSocketMessage = JSON.parse(message);
          this.server.emit('message', parsedMessage);
        } catch (error) {
          this.logger.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  async onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.redisPublisher) {
      await this.redisPublisher.quit();
    }

    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }

    this.logger.log('WebSocket Gateway destroyed');
  }

  // Helper methods for external services
  getConnectedClients(): AuthenticatedClient[] {
    return Array.from(this.clients.values());
  }

  getClientCount(): number {
    return this.clients.size;
  }

  isClientConnected(clientId: string): boolean {
    return this.clients.has(clientId);
  }
}
