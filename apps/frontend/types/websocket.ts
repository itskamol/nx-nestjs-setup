// WebSocket types for real-time communication

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
  messageId: string;
  clientId?: string;
  sequence?: number;
}

export enum WebSocketMessageType {
  FACE_RECOGNITION = 'face_recognition',
  USER_UPDATE = 'user_update',
  SYSTEM_EVENT = 'system_event',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
  NOTIFICATION = 'notification',
  CONNECTION_STATUS = 'connection_status',
  STATISTICS_UPDATE = 'statistics_update',
  ACTIVITY_LOG = 'activity_log',
  DEVICE_STATUS = 'device_status',
  ALERT = 'alert',
}

export interface WebSocketConnection {
  id: string;
  isConnected: boolean;
  reconnectAttempts: number;
  lastMessage?: string;
  lastPing?: string;
  url: string;
  protocols?: string[];
  binaryType?: 'blob' | 'arraybuffer';
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  timeout?: number;
  binaryType?: 'blob' | 'arraybuffer';
  debug?: boolean;
}

export interface WebSocketEventHandlers {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage<unknown>) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  onHeartbeat?: () => void;
}

export interface FaceRecognitionWebSocketData {
  eventType: 'recognition' | 'enrollment' | 'verification';
  userId?: string;
  faceId: string;
  confidence: number;
  timestamp: string;
  imageData?: string;
  location?: string;
  cameraId?: string;
  status: 'success' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}

export interface UserUpdateWebSocketData {
  userId: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  user: unknown;
  timestamp: string;
  changes?: Record<string, unknown>;
}

export interface SystemEventWebSocketData {
  eventType: 'system_started' | 'system_stopped' | 'config_updated' | 'maintenance';
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface NotificationWebSocketData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  duration?: number;
  actions?: NotificationAction[];
  targetUsers?: string[];
  targetRoles?: string[];
}

export interface NotificationAction {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface StatisticsUpdateWebSocketData {
  type: 'face_recognition' | 'user_activity' | 'system_performance';
  data: unknown;
  timestamp: string;
  interval: 'realtime' | 'minute' | 'hour' | 'day';
}

export interface ActivityLogWebSocketData {
  userId: string;
  action: string;
  target?: string;
  targetType?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export interface DeviceStatusWebSocketData {
  deviceId: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  lastSeen: string;
  metrics?: Record<string, unknown>;
  alerts?: DeviceAlert[];
}

export interface DeviceAlert {
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  resolved?: boolean;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: string;
  messageId: string;
  clientId: string;
  serverTime?: string;
  uptime?: number;
}

export interface ConnectionStatusMessage {
  type: 'connection_status';
  status: 'connected' | 'disconnected' | 'reconnecting';
  message: string;
  timestamp: string;
  clientId?: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  timestamp: string;
  messageId: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface WebSocketReconnectConfig {
  maxAttempts: number;
  delay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: unknown) => boolean;
}

export interface WebSocketMetrics {
  connectedAt?: string;
  disconnectedAt?: string;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  reconnectCount: number;
  lastPingTime?: string;
  lastPongTime?: string;
  averageLatency?: number;
}

export interface WebSocketQueue {
  messages: WebSocketMessage<unknown>[];
  maxSize: number;
  onFull?: 'drop' | 'block' | 'flush';
}

export interface WebSocketSubscription {
  id: string;
  messageType: WebSocketMessageType;
  filter?: (data: unknown) => boolean;
  callback: (data: unknown) => void;
  isActive: boolean;
}

// Note: Types are exported through the main index.ts file
