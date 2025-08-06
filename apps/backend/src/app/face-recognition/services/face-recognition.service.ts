import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HikvisionService } from './hikvision.service';
import { CacheService } from '../../common/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { CreateFaceRecordDto, FaceEventType, FaceRecognitionEventDto } from '../dto';
import {
  FaceRecognitionEventEntity,
  FaceRecognitionStatsEntity,
  FaceRecordEntity,
} from '../entities';
import { Prisma } from '@prisma/client';

interface WebhookEventData {
  faceId: string;
  eventType: string;
  confidence: number;
  imageData?: string;
  camera?: {
    id: string;
    location?: string;
  };
}

@Injectable()
export class FaceRecognitionService {
  private readonly logger = new Logger(FaceRecognitionService.name);
  private readonly cachePrefix = 'face_recognition';

  constructor(
    private readonly prisma: PrismaService,
    private readonly hikvisionService: HikvisionService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService
  ) {}

  async enrollFace(
    createFaceRecordDto: CreateFaceRecordDto,
    options?: {
      name?: string;
      gender?: string;
      age?: number;
    }
  ): Promise<FaceRecordEntity> {
    try {
      // Check if face already exists
      const existingFace = await this.prisma.faceRecord.findUnique({
        where: { faceId: createFaceRecordDto.faceId },
      });

      if (existingFace) {
        throw new ConflictException(`Face with ID ${createFaceRecordDto.faceId} already exists`);
      }

      // Enroll face with Hikvision
      const hikvisionResult = await this.hikvisionService.enrollFace(
        createFaceRecordDto.imageData,
        createFaceRecordDto.faceId,
        options
      );

      if (!hikvisionResult.success) {
        throw new BadRequestException(
          `Failed to enroll face with Hikvision: ${hikvisionResult.error}`
        );
      }

      // Save to database
      const faceRecord = await this.prisma.faceRecord.create({
        data: {
          userId: createFaceRecordDto.userId,
          faceId: createFaceRecordDto.faceId,
          imageData: createFaceRecordDto.imageData,
          faceData: createFaceRecordDto.faceData,
          confidence: createFaceRecordDto.confidence,
        },
        include: {
          user: true,
        },
      });

      // Log enrollment event
      await this.logEvent({
        faceRecordId: faceRecord.id,
        faceId: faceRecord.faceId,
        eventType: FaceEventType.ENROLLED,
        confidence: createFaceRecordDto.confidence,
        metadata: {
          enrollmentMethod: 'manual',
        },
      });

      // Clear cache
      await this.clearFaceCache();

      this.logger.log(`Face enrolled successfully: ${createFaceRecordDto.faceId}`);
      return FaceRecordEntity.fromPrisma(faceRecord);
    } catch (error) {
      this.logger.error('Face enrollment failed', error);
      throw error;
    }
  }

  async recognizeFace(imageData: string): Promise<{
    recognizedFaces: FaceRecordEntity[];
    unknownFaces: Array<{
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
  }> {
    try {
      // Recognize face with Hikvision
      const hikvisionResult = await this.hikvisionService.recognizeFace(imageData);

      if (!hikvisionResult.success) {
        throw new BadRequestException(`Face recognition failed: ${hikvisionResult.error}`);
      }

      const recognizedFaces: FaceRecordEntity[] = [];
      const unknownFaces: Array<{
        confidence: number;
        boundingBox: { x: number; y: number; width: number; height: number };
      }> = [];

      for (const face of hikvisionResult.faces || []) {
        if (face.confidence > 0.7) {
          // Confidence threshold
          // Find face record in database
          const faceRecord = await this.prisma.faceRecord.findUnique({
            where: { faceId: face.faceId },
            include: { user: true },
          });

          if (faceRecord) {
            recognizedFaces.push(FaceRecordEntity.fromPrisma(faceRecord));

            // Log recognition event
            await this.logEvent({
              faceRecordId: faceRecord.id,
              faceId: face.faceId,
              eventType: FaceEventType.RECOGNIZED,
              confidence: face.confidence,
              metadata: { boundingBox: face.boundingBox },
            });
          } else {
            unknownFaces.push({
              confidence: face.confidence,
              boundingBox: face.boundingBox,
            });
          }
        } else {
          unknownFaces.push({
            confidence: face.confidence,
            boundingBox: face.boundingBox,
          });
        }
      }

      // Log detection event
      if (unknownFaces.length > 0) {
        await this.logEvent({
          eventType: FaceEventType.DETECTED,
          confidence: Math.max(...unknownFaces.map(f => f.confidence)),
          metadata: { unknownFaceCount: unknownFaces.length },
        });
      }

      this.logger.log(
        `Face recognition completed: ${recognizedFaces.length} recognized, ${unknownFaces.length} unknown`
      );
      return { recognizedFaces, unknownFaces };
    } catch (error) {
      this.logger.error('Face recognition failed', error);
      throw error;
    }
  }

  async getFaceRecords(
    page: number = 1,
    limit: number = 10,
    filters?: {
      userId?: string;
      faceId?: string;
      isActive?: boolean;
    }
  ): Promise<{
    records: FaceRecordEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const cacheKey = `${this.cachePrefix}:face_records:${page}:${limit}:${JSON.stringify(filters)}`;

    // Try cache first
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult.success && cachedResult.data) {
      return JSON.parse(cachedResult.data);
    }

    const skip = (page - 1) * limit;
    const where: Prisma.FaceRecordWhereInput = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.faceId) where.faceId = filters.faceId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [records, total] = await Promise.all([
      this.prisma.faceRecord.findMany({
        where,
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.faceRecord.count({ where }),
    ]);

    const result = {
      records: records.map(record => FaceRecordEntity.fromPrisma(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache result
    await this.cacheService.set(cacheKey, JSON.stringify(result), { ttl: 300 }); // 5 minutes

    return result;
  }

  async getFaceRecord(id: string): Promise<FaceRecordEntity> {
    const cacheKey = `${this.cachePrefix}:face_record:${id}`;

    // Try cache first
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult.success && cachedResult.data) {
      return JSON.parse(cachedResult.data);
    }

    const faceRecord = await this.prisma.faceRecord.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!faceRecord) {
      throw new NotFoundException(`Face record with ID ${id} not found`);
    }

    const result = FaceRecordEntity.fromPrisma(faceRecord);

    // Cache result
    await this.cacheService.set(cacheKey, JSON.stringify(result), { ttl: 300 });

    return result;
  }

  async updateFaceRecord(
    id: string,
    updateData: {
      userId?: string;
      faceData?: string;
      confidence?: number;
      isActive?: boolean;
    }
  ): Promise<FaceRecordEntity> {
    const existingRecord = await this.prisma.faceRecord.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      throw new NotFoundException(`Face record with ID ${id} not found`);
    }

    const updatedRecord = await this.prisma.faceRecord.update({
      where: { id },
      data: updateData,
      include: { user: true },
    });

    // Log update event
    await this.logEvent({
      faceRecordId: updatedRecord.id,
      faceId: updatedRecord.faceId,
      eventType: FaceEventType.UPDATED,
      confidence: updatedRecord.confidence,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    // Clear cache
    await this.clearFaceCache();

    this.logger.log(`Face record updated: ${id}`);
    return FaceRecordEntity.fromPrisma(updatedRecord);
  }

  async deleteFaceRecord(id: string): Promise<void> {
    const faceRecord = await this.prisma.faceRecord.findUnique({
      where: { id },
    });

    if (!faceRecord) {
      throw new NotFoundException(`Face record with ID ${id} not found`);
    }

    // Delete from Hikvision
    await this.hikvisionService.deleteFace(faceRecord.faceId);

    // Delete from database
    await this.prisma.faceRecord.delete({
      where: { id },
    });

    // Log deletion event
    await this.logEvent({
      faceRecordId: id,
      faceId: faceRecord.faceId,
      eventType: FaceEventType.DELETED,
      confidence: faceRecord.confidence,
    });

    // Clear cache
    await this.clearFaceCache();

    this.logger.log(`Face record deleted: ${id}`);
  }

  async getEvents(
    page: number = 1,
    limit: number = 10,
    filters?: {
      faceRecordId?: string;
      faceId?: string;
      eventType?: FaceEventType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    events: FaceRecognitionEventEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const where: Prisma.FaceRecognitionEventWhereInput = {};

    if (filters?.faceRecordId) where.faceRecordId = filters.faceRecordId;
    if (filters?.faceId) where.faceId = filters.faceId;
    if (filters?.eventType) where.eventType = filters.eventType;
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.faceRecognitionEvent.findMany({
        where,
        skip,
        take: limit,
        include: { faceRecord: { include: { user: true } } },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.faceRecognitionEvent.count({ where }),
    ]);

    return {
      events: events.map(event => FaceRecognitionEventEntity.fromPrisma(event)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(): Promise<FaceRecognitionStatsEntity> {
    const [totalRecords, activeRecords, totalEvents, eventsByType, recentEvents] =
      await Promise.all([
        this.prisma.faceRecord.count(),
        this.prisma.faceRecord.count({ where: { isActive: true } }),
        this.prisma.faceRecognitionEvent.count(),
        this.prisma.faceRecognitionEvent.groupBy({
          by: ['eventType'],
          _count: { eventType: true },
        }),
        this.prisma.faceRecognitionEvent.findMany({
          take: 10,
          include: { faceRecord: { include: { user: true } } },
          orderBy: { timestamp: 'desc' },
        }),
      ]);

    const eventsByTypeMap = eventsByType.reduce(
      (acc, group) => {
        acc[group.eventType] = group._count.eventType;
        return acc;
      },
      {} as Record<string, number>
    );

    return new FaceRecognitionStatsEntity({
      totalRecords,
      activeRecords,
      totalEvents,
      eventsByType: eventsByTypeMap,
      recentEvents: recentEvents.map(event => FaceRecognitionEventEntity.fromPrisma(event)),
    });
  }

  async processWebhookEvent(eventData: WebhookEventData): Promise<void> {
    try {
      // Validate and process webhook event from Hikvision
      const eventDto: FaceRecognitionEventDto = {
        faceId: eventData.faceId,
        eventType: eventData.eventType as FaceEventType,
        confidence: eventData.confidence,
        cameraId: eventData.camera?.id,
        location: eventData.camera?.location,
        imageData: eventData.imageData,
        metadata: {
          webhookEvent: true,
          rawEvent: eventData,
        },
      };

      await this.logEvent(eventDto);
      this.logger.log(
        `Webhook event processed: ${eventData.eventType} for face ${eventData.faceId}`
      );
    } catch (error) {
      this.logger.error('Webhook event processing failed', error);
      throw error;
    }
  }

  async cleanupOldRecords(): Promise<number> {
    const retentionDays =
      this.configService.get<number>('FACE_RECOGNITION_STORAGE_RETENTION_DAYS') || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.faceRecord.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isActive: false,
      },
    });

    this.logger.log(`Cleaned up ${result.count} old face records`);
    return result.count;
  }

  private async logEvent(eventDto: FaceRecognitionEventDto): Promise<FaceRecognitionEventEntity> {
    const event = await this.prisma.faceRecognitionEvent.create({
      data: {
        faceRecordId: eventDto.faceRecordId,
        faceId: eventDto.faceId,
        eventType: eventDto.eventType,
        confidence: eventDto.confidence,
        cameraId: eventDto.cameraId,
        location: eventDto.location,
        imageData: eventDto.imageData,
        metadata: eventDto.metadata as Prisma.JsonValue,
      },
    });

    return FaceRecognitionEventEntity.fromPrisma(event);
  }

  private async clearFaceCache(): Promise<void> {
    // Simple cache clearing implementation
    try {
      await this.cacheService.del(`${this.cachePrefix}:face_records:*`);
    } catch (error) {
      this.logger.warn('Failed to clear face cache', error);
    }
  }
}
