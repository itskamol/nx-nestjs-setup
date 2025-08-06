import { FaceEventType, FaceRecognitionEvent, FaceRecord } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

export class FaceRecordEntity {
  @Expose()
  id: string;

  @Expose()
  userId?: string;

  @Expose()
  faceId: string;

  @Exclude()
  imageData: string;

  @Exclude()
  faceData: string;

  @Expose()
  confidence: number;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<FaceRecord>) {
    Object.assign(this, partial);
  }

  static fromPrisma(faceRecord: FaceRecord): FaceRecordEntity {
    return new FaceRecordEntity({
      id: faceRecord.id,
      userId: faceRecord.userId,
      faceId: faceRecord.faceId,
      imageData: faceRecord.imageData,
      faceData: faceRecord.faceData,
      confidence: faceRecord.confidence,
      isActive: faceRecord.isActive,
      createdAt: faceRecord.createdAt,
      updatedAt: faceRecord.updatedAt,
    });
  }
}

export class FaceRecognitionEventEntity {
  @Expose()
  id: string;

  @Expose()
  faceRecordId?: string;

  @Expose()
  faceId?: string;

  @Expose()
  eventType: FaceEventType;

  @Expose()
  confidence: number;

  @Expose()
  timestamp: Date;

  @Expose()
  cameraId?: string;

  @Expose()
  location?: string;

  @Exclude()
  imageData?: string;

  @Expose()
  metadata?: Record<string, any>;

  constructor(partial: Partial<FaceRecognitionEvent>) {
    Object.assign(this, partial);
  }

  static fromPrisma(event: FaceRecognitionEvent): FaceRecognitionEventEntity {
    return new FaceRecognitionEventEntity({
      id: event.id,
      faceRecordId: event.faceRecordId,
      faceId: event.faceId,
      eventType: event.eventType,
      confidence: event.confidence,
      timestamp: event.timestamp,
      cameraId: event.cameraId,
      location: event.location,
      imageData: event.imageData,
      metadata: event.metadata,
    });
  }
}

export class FaceRecognitionStatsEntity {
  @Expose()
  totalRecords: number;

  @Expose()
  activeRecords: number;

  @Expose()
  totalEvents: number;

  @Expose()
  eventsByType: Record<string, number>;

  @Expose()
  recentEvents: FaceRecognitionEventEntity[];

  constructor(partial: Partial<FaceRecognitionStatsEntity>) {
    Object.assign(this, partial);
  }
}
