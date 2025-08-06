// WebSocket Event Types
export enum WebSocketEventType {
  FACE_RECOGNITION = 'FACE_RECOGNITION',
  USER_UPDATE = 'USER_UPDATE',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
  HEARTBEAT = 'HEARTBEAT',
  ERROR = 'ERROR',
  NOTIFICATION = 'NOTIFICATION',
  CONNECTION_STATUS = 'CONNECTION_STATUS',
  STATISTICS_UPDATE = 'STATISTICS_UPDATE',
  ACTIVITY_LOG = 'ACTIVITY_LOG',
  DEVICE_STATUS = 'DEVICE_STATUS',
  ALERT = 'ALERT',
}

// Base WebSocket Message Structure
export interface WebSocketMessage<T = any> {
  type: WebSocketEventType;
  timestamp: string;
  data: T;
  messageId?: string;
  clientId?: string;
}

// Face Recognition Event Data
export interface FaceRecognitionWebSocketData {
  eventId: string;
  eventType: 'RECOGNITION_EVENT' | 'ENROLLMENT_EVENT' | 'UNKNOWN_FACE' | 'VERIFICATION_EVENT';
  faceId?: string;
  userId?: string;
  confidence: number;
  timestamp: string;
  cameraId?: string;
  location?: string;
  imageUrl?: string;
  metadata?: {
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    quality?: number;
    liveness?: boolean;
    emotion?: string;
    age?: number;
    gender?: string;
  };
  recognitionTime: number;
}

// User Update Event Data
export interface UserUpdateWebSocketData {
  userId: string;
  updateType: 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED';
  userData: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive: boolean;
    lastLogin?: string;
  };
  timestamp: string;
}

// System Event Data
export interface SystemEventWebSocketData {
  eventId: string;
  eventType:
    | 'SYSTEM_START'
    | 'SYSTEM_STOP'
    | 'CONFIG_UPDATE'
    | 'BACKUP_COMPLETE'
    | 'ERROR_OCCURRED';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Statistics Update Data
export interface StatisticsUpdateWebSocketData {
  timestamp: string;
  totalFaces: number;
  activeFaces: number;
  totalEvents: number;
  eventsToday: number;
  recognitionRate: number;
  averageConfidence: number;
  systemLoad: {
    cpu: number;
    memory: number;
    disk: number;
  };
  cameraStatus: Array<{
    cameraId: string;
    status: 'ONLINE' | 'OFFLINE' | 'ERROR';
    lastSeen: string;
  }>;
}

// Activity Log Data
export interface ActivityLogWebSocketData {
  logId: string;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// Device Status Data
export interface DeviceStatusWebSocketData {
  deviceId: string;
  deviceType: 'CAMERA' | 'SERVER' | 'DATABASE' | 'CACHE';
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE';
  lastUpdate: string;
  metrics?: Record<string, any>;
  alerts?: string[];
}

// Alert Data
export interface AlertWebSocketData {
  alertId: string;
  type: 'SECURITY' | 'SYSTEM' | 'PERFORMANCE' | 'MAINTENANCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  metadata?: Record<string, any>;
}

// Notification Data
export interface NotificationWebSocketData {
  notificationId: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  title: string;
  message: string;
  timestamp: string;
  targetUsers?: string[];
  isGlobal: boolean;
  expiresAt?: string;
}

// Connection Status Data
export interface ConnectionStatusWebSocketData {
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'AUTHENTICATED' | 'ERROR';
  message?: string;
  timestamp: string;
  clientId: string;
}

// Heartbeat Data
export interface HeartbeatWebSocketData {
  timestamp: string;
  clientId: string;
  serverTime: string;
  uptime: number;
  connectedClients: number;
}

// Error Data
export interface ErrorWebSocketData {
  errorId: string;
  code: string;
  message: string;
  timestamp: string;
  stack?: string;
  context?: Record<string, any>;
}

// Authenticated Client Information
export interface AuthenticatedClient {
  id: string;
  userId: string;
  email: string;
  role: string;
  connectedAt: string;
  lastActivity: string;
  subscriptions: WebSocketEventType[];
}

// WebSocket Event Payloads
export type WebSocketEventPayload =
  | FaceRecognitionWebSocketData
  | UserUpdateWebSocketData
  | SystemEventWebSocketData
  | StatisticsUpdateWebSocketData
  | ActivityLogWebSocketData
  | DeviceStatusWebSocketData
  | AlertWebSocketData
  | NotificationWebSocketData
  | ConnectionStatusWebSocketData
  | HeartbeatWebSocketData
  | ErrorWebSocketData;

// Client Subscription Request
export interface SubscriptionRequest {
  events: WebSocketEventType[];
  filters?: Record<string, any>;
}

// Broadcast Options
export interface BroadcastOptions {
  targetRoles?: string[];
  targetUsers?: string[];
  excludeUsers?: string[];
  filter?: (client: AuthenticatedClient) => boolean;
}

// WebSocket Gateway Configuration
export interface WebSocketGatewayConfig {
  path: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  heartbeatInterval?: number;
  maxConnections?: number;
  connectionTimeout?: number;
}
