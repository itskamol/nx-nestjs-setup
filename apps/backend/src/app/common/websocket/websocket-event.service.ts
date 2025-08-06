import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ActivityLogWebSocketData,
  AlertWebSocketData,
  DeviceStatusWebSocketData,
  FaceRecognitionWebSocketData,
  StatisticsUpdateWebSocketData,
  SystemEventWebSocketData,
  UserUpdateWebSocketData,
} from '@shared/types/websocket';
import { FaceRecognitionService } from '../../face-recognition/services/face-recognition.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WebSocketEventService {
  private readonly logger = new Logger(WebSocketEventService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly faceRecognitionService: FaceRecognitionService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService
  ) {}

  // Face Recognition Events
  async emitFaceRecognitionEvent(
    data: Omit<FaceRecognitionWebSocketData, 'eventId' | 'timestamp'>
  ) {
    const eventData: FaceRecognitionWebSocketData = {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      recognitionTime: Date.now(),
      ...data,
    };

    this.eventEmitter.emit('face.recognition.event', eventData);
    this.logger.log(`Face recognition event emitted: ${data.eventType}`);
  }

  async emitFaceRecognized(
    faceId: string,
    confidence: number,
    userId?: string,
    cameraId?: string,
    metadata?: any
  ) {
    await this.emitFaceRecognitionEvent({
      eventType: 'RECOGNITION_EVENT',
      faceId,
      userId,
      confidence,
      cameraId,
      metadata,
      recognitionTime: Date.now(),
    });
  }

  async emitUnknownFaceDetected(
    faceId: string,
    confidence: number,
    cameraId?: string,
    metadata?: any
  ) {
    await this.emitFaceRecognitionEvent({
      eventType: 'UNKNOWN_FACE',
      faceId,
      confidence,
      cameraId,
      metadata,
      recognitionTime: Date.now(),
    });
  }

  async emitFaceEnrolled(faceId: string, userId: string, confidence: number, metadata?: any) {
    await this.emitFaceRecognitionEvent({
      eventType: 'ENROLLMENT_EVENT',
      faceId,
      userId,
      confidence,
      metadata,
      recognitionTime: Date.now(),
    });
  }

  async emitFaceVerification(
    faceId: string,
    userId: string,
    confidence: number,
    success: boolean,
    metadata?: any
  ) {
    await this.emitFaceRecognitionEvent({
      eventType: 'VERIFICATION_EVENT',
      faceId,
      userId,
      confidence,
      metadata: { ...metadata, success },
      recognitionTime: Date.now(),
    });
  }

  // Statistics Events
  async emitStatisticsUpdate() {
    try {
      const stats = await this.faceRecognitionService.getStats();
      const systemLoad = await this.getSystemLoad();
      const cameraStatus = await this.getCameraStatus();

      const statisticsData: StatisticsUpdateWebSocketData = {
        timestamp: new Date().toISOString(),
        totalFaces: stats.totalRecords,
        activeFaces: stats.activeRecords,
        totalEvents: stats.totalEvents,
        eventsToday: stats.eventsByType['DETECTED'] || 0,
        recognitionRate: 0.95, // Mock value
        averageConfidence: 0.85, // Mock value
        systemLoad,
        cameraStatus,
      };

      this.eventEmitter.emit('statistics.updated', statisticsData);
      this.logger.log('Statistics update emitted');
    } catch (error) {
      this.logger.error('Error emitting statistics update:', error);
    }
  }

  // User Update Events
  async emitUserUpdate(userId: string, updateType: UserUpdateWebSocketData['updateType']) {
    try {
      const user = await this.usersService.findOne(userId);

      if (user) {
        const userData: UserUpdateWebSocketData = {
          userId,
          updateType,
          userData: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
          },
          timestamp: new Date().toISOString(),
        };

        this.eventEmitter.emit('user.updated', userData);
        this.logger.log(`User update emitted: ${updateType} for user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Error emitting user update:', error);
    }
  }

  async emitUserCreated(userId: string) {
    await this.emitUserUpdate(userId, 'CREATED');
  }

  async emitUserUpdated(userId: string) {
    await this.emitUserUpdate(userId, 'UPDATED');
  }

  async emitUserDeleted(userId: string) {
    await this.emitUserUpdate(userId, 'DELETED');
  }

  async emitUserActivated(userId: string) {
    await this.emitUserUpdate(userId, 'ACTIVATED');
  }

  async emitUserDeactivated(userId: string) {
    await this.emitUserUpdate(userId, 'DEACTIVATED');
  }

  // System Events
  async emitSystemEvent(
    eventType: SystemEventWebSocketData['eventType'],
    message: string,
    severity: SystemEventWebSocketData['severity'] = 'INFO',
    metadata?: Record<string, any>
  ) {
    const systemEventData: SystemEventWebSocketData = {
      eventId: this.generateEventId(),
      eventType,
      severity,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.eventEmitter.emit('system.event', systemEventData);
    this.logger.log(`System event emitted: ${eventType} - ${message}`);
  }

  async emitSystemStart() {
    await this.emitSystemEvent('SYSTEM_START', 'System started successfully', 'INFO');
  }

  async emitSystemStop() {
    await this.emitSystemEvent('SYSTEM_STOP', 'System stopping', 'INFO');
  }

  async emitConfigUpdate(configName: string) {
    await this.emitSystemEvent('CONFIG_UPDATE', `Configuration updated: ${configName}`, 'INFO');
  }

  async emitBackupComplete() {
    await this.emitSystemEvent('BACKUP_COMPLETE', 'Database backup completed successfully', 'INFO');
  }

  async emitSystemError(error: Error, context?: Record<string, any>) {
    await this.emitSystemEvent('ERROR_OCCURRED', error.message, 'ERROR', {
      stack: error.stack,
      ...context,
    });
  }

  // Activity Log Events
  async emitActivityLog(
    userId: string,
    action: string,
    resource: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    const activityLogData: ActivityLogWebSocketData = {
      logId: this.generateEventId(),
      userId,
      action,
      resource,
      details,
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
    };

    this.eventEmitter.emit('activity.log', activityLogData);
    this.logger.log(`Activity log emitted: ${action} on ${resource} by user ${userId}`);
  }

  // Alert Events
  async emitAlert(
    type: AlertWebSocketData['type'],
    severity: AlertWebSocketData['severity'],
    title: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    const alertData: AlertWebSocketData = {
      alertId: this.generateEventId(),
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      metadata,
    };

    this.eventEmitter.emit('alert.created', alertData);
    this.logger.log(`Alert emitted: ${title} - ${message}`);
  }

  async emitSecurityAlert(message: string, metadata?: Record<string, any>) {
    await this.emitAlert('SECURITY', 'HIGH', 'Security Alert', message, metadata);
  }

  async emitSystemAlert(message: string, metadata?: Record<string, any>) {
    await this.emitAlert('SYSTEM', 'MEDIUM', 'System Alert', message, metadata);
  }

  async emitPerformanceAlert(message: string, metadata?: Record<string, any>) {
    await this.emitAlert('PERFORMANCE', 'MEDIUM', 'Performance Alert', message, metadata);
  }

  // Device Status Events
  async emitDeviceStatus(
    deviceId: string,
    deviceType: DeviceStatusWebSocketData['deviceType'],
    status: DeviceStatusWebSocketData['status'],
    metrics?: Record<string, any>,
    alerts?: string[]
  ) {
    const deviceStatusData: DeviceStatusWebSocketData = {
      deviceId,
      deviceType,
      status,
      lastUpdate: new Date().toISOString(),
      metrics,
      alerts,
    };

    this.eventEmitter.emit('device.status', deviceStatusData);
    this.logger.log(`Device status emitted: ${deviceId} - ${status}`);
  }

  async emitCameraOnline(cameraId: string) {
    await this.emitDeviceStatus(cameraId, 'CAMERA', 'ONLINE');
  }

  async emitCameraOffline(cameraId: string) {
    await this.emitDeviceStatus(cameraId, 'CAMERA', 'OFFLINE');
  }

  async emitCameraError(cameraId: string, error: string) {
    await this.emitDeviceStatus(cameraId, 'CAMERA', 'ERROR', undefined, [error]);
  }

  // Helper methods
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getSystemLoad() {
    // This would typically use a system monitoring library
    // For now, we'll return mock data
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
    };
  }

  private async getCameraStatus() {
    // This would typically query the camera status from the database
    // For now, we'll return mock data
    return [
      {
        cameraId: 'camera-1',
        status: 'ONLINE' as const,
        lastSeen: new Date().toISOString(),
      },
      {
        cameraId: 'camera-2',
        status: 'OFFLINE' as const,
        lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      },
    ];
  }

  // Periodic statistics update
  async startPeriodicUpdates() {
    // Emit statistics every 30 seconds
    setInterval(() => {
      this.emitStatisticsUpdate();
    }, 30000);

    // Emit initial statistics
    await this.emitStatisticsUpdate();
  }
}
