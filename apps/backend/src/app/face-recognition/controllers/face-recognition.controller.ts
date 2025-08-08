import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FaceRecognitionService, HikvisionService } from '../services';
import {
  CreateFaceRecordDto,
  FaceRecognitionQueryDto,
  FaceWebhookDto,
  UpdateFaceRecordDto,
} from '../dto';
import {
  FaceRecognitionEventEntity,
  FaceRecognitionStatsEntity,
  FaceRecordEntity,
} from '../entities';
import { RolesGuard } from '../../common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('FaceRecognition')
@ApiBearerAuth('JWT-auth')
@Controller('face-recognition')
@UseGuards(RolesGuard)
export class FaceRecognitionController {
  private readonly logger = new Logger(FaceRecognitionController.name);

  constructor(
    private readonly faceRecognitionService: FaceRecognitionService,
    private readonly hikvisionService: HikvisionService
  ) {}

  @Post('enroll')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({
    summary: 'Enroll a new face for recognition',
    description: 'Register a new face in the system for future recognition',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: FaceRecordEntity,
    description: 'Face successfully enrolled',
    example: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      userId: 'u47ac10b-58cc-4372-a567-0e02b2c3d479',
      faceId: 'HIK_FACE_001',
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
      faceData: 'FACE_TEMPLATE_DATA_BASE64',
      confidence: 0.95,
      isActive: true,
      createdAt: '2025-08-06T10:30:00.000Z',
      updatedAt: '2025-08-06T10:30:00.000Z',
    },
  })
  async enrollFace(
    @Body() createFaceRecordDto: CreateFaceRecordDto,
    @Body('options') options?: { name?: string; gender?: string; age?: number }
  ): Promise<FaceRecordEntity> {
    return this.faceRecognitionService.enrollFace(createFaceRecordDto, options);
  }

  @Post('recognize')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Recognize faces from image',
    description: 'Upload an image and identify any known faces in it',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file for face recognition',
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPG, PNG, etc.)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Face recognition results',
    example: {
      recognizedFaces: [
        {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          userId: 'u47ac10b-58cc-4372-a567-0e02b2c3d479',
          faceId: 'HIK_FACE_001',
          confidence: 0.95,
          name: 'John Doe',
          isActive: true,
        },
      ],
      unknownFaces: [
        {
          confidence: 0.87,
          boundingBox: { x: 100, y: 150, width: 200, height: 250 },
        },
      ],
    },
  })
  async recognizeFace(@UploadedFile() image: UploadedFile): Promise<{
    recognizedFaces: FaceRecordEntity[];
    unknownFaces: Array<{
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
  }> {
    if (!image) {
      throw new Error('Image file is required');
    }

    const imageData = `data:${image.mimetype};base64,${image.buffer.toString('base64')}`;
    return this.faceRecognitionService.recognizeFace(imageData);
  }

  @Post('recognize-base64')
  @ApiOperation({
    summary: 'Recognize faces from base64 image data',
    description: 'Send base64 encoded image data to identify known faces',
  })
  @ApiBody({
    description: 'Base64 encoded image data',
    schema: {
      type: 'object',
      properties: {
        imageData: {
          type: 'string',
          description: 'Base64 encoded image data (data:image/jpeg;base64,...)',
          example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
        },
      },
      required: ['imageData'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Face recognition results',
    example: {
      recognizedFaces: [
        {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          faceId: 'HIK_FACE_001',
          confidence: 0.92,
          name: 'Jane Smith',
        },
      ],
      unknownFaces: [],
    },
  })
  async recognizeFaceBase64(@Body('imageData') imageData: string): Promise<{
    recognizedFaces: FaceRecordEntity[];
    unknownFaces: Array<{
      confidence: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
  }> {
    if (!imageData) {
      throw new Error('Image data is required');
    }

    return this.faceRecognitionService.recognizeFace(imageData);
  }

  @Get('records')
  @ApiOperation({
    summary: 'Get face records with pagination',
    description: 'Retrieve paginated list of face records with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated face records',
    example: {
      records: [
        {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          userId: 'u47ac10b-58cc-4372-a567-0e02b2c3d479',
          faceId: 'HIK_FACE_001',
          confidence: 0.95,
          isActive: true,
          createdAt: '2025-08-06T10:30:00.000Z',
          updatedAt: '2025-08-06T10:30:00.000Z',
        },
      ],
      total: 50,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  async getFaceRecords(@Query() query: FaceRecognitionQueryDto): Promise<{
    records: FaceRecordEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.faceRecognitionService.getFaceRecords(query.page, query.limit, {
      userId: query.userId,
      faceId: query.faceId,
    });
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get a specific face record' })
  @ApiResponse({ status: HttpStatus.OK, type: FaceRecordEntity })
  async getFaceRecord(@Param('id', ParseUUIDPipe) id: string): Promise<FaceRecordEntity> {
    return this.faceRecognitionService.getFaceRecord(id);
  }

  @Put('records/:id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Update a face record' })
  @ApiResponse({ status: HttpStatus.OK, type: FaceRecordEntity })
  async updateFaceRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdateFaceRecordDto
  ): Promise<FaceRecordEntity> {
    return this.faceRecognitionService.updateFaceRecord(id, updateData);
  }

  @Delete('records/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a face record' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async deleteFaceRecord(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.faceRecognitionService.deleteFaceRecord(id);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get face recognition events',
    description: 'Retrieve face recognition events with filtering and pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated face recognition events',
    example: {
      events: [
        {
          id: 'e47ac10b-58cc-4372-a567-0e02b2c3d479',
          faceRecordId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          faceId: 'HIK_FACE_001',
          eventType: 'RECOGNIZED',
          confidence: 0.95,
          cameraId: 'CAM_001',
          location: 'Main Entrance',
          timestamp: '2025-08-06T10:30:00.000Z',
          metadata: { temperature: 36.5 },
        },
      ],
      total: 100,
      page: 1,
      limit: 10,
      totalPages: 10,
    },
  })
  async getEvents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('faceRecordId') faceRecordId?: string,
    @Query('faceId') faceId?: string,
    @Query('eventType') eventType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{
    events: FaceRecognitionEventEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filters: Record<string, unknown> = {};
    if (faceRecordId) filters.faceRecordId = faceRecordId;
    if (faceId) filters.faceId = faceId;
    if (eventType) filters.eventType = eventType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.faceRecognitionService.getEvents(page, limit, filters);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get face recognition statistics',
    description: 'Retrieve comprehensive face recognition system statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FaceRecognitionStatsEntity,
    example: {
      totalFaceRecords: 150,
      activeFaceRecords: 142,
      totalEvents: 2580,
      eventsToday: 45,
      recognitionAccuracy: 0.94,
      topLocations: [
        { location: 'Main Entrance', count: 380 },
        { location: 'Office Floor 1', count: 220 },
        { location: 'Parking', count: 185 },
      ],
      eventsByType: {
        RECOGNIZED: 2200,
        UNKNOWN: 280,
        ENROLLED: 150,
        UPDATED: 25,
        DELETED: 5,
      },
      lastUpdated: '2025-08-06T10:30:00.000Z',
    },
  })
  async getStats(): Promise<FaceRecognitionStatsEntity> {
    return this.faceRecognitionService.getStats();
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle webhook events from Hikvision',
    description: 'Receive and process webhook events from Hikvision face recognition system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
    example: { success: true },
  })
  async handleWebhook(@Body() webhookDto: FaceWebhookDto): Promise<{ success: boolean }> {
    console.log(webhookDto);
    // Validate webhook signature
    const isValid = this.hikvisionService.validateWebhookSignature(
      JSON.stringify(webhookDto),
      webhookDto.signature,
      process.env.FACE_WEBHOOK_SECRET || 'your-webhook-secret'
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
      throw new Error('Invalid webhook signature');
    }

    await this.faceRecognitionService.processWebhookEvent(webhookDto);
    return { success: true };
  }

  @Post('test-connection')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Test connection to Hikvision device',
    description: 'Verify connectivity and authentication with Hikvision face recognition system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection test result',
    example: {
      success: true,
      message: 'Connection successful',
    },
  })
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    const isConnected = await this.hikvisionService.testConnection();
    return {
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed',
    };
  }

  @Post('test-digest-auth')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Test Digest Authentication with Hikvision device',
    description: 'Attempt to authenticate using Digest Authentication method',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Digest authentication test results',
  })
  async testDigestAuth(): Promise<{
    success: boolean;
    details: string;
  }> {
    return this.hikvisionService.testDigestAuth();
  }

  @Get('faces/list')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({
    summary: 'Get list of faces from Hikvision device',
    description: 'Retrieve all face records stored in the Hikvision system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of faces from Hikvision device',
    example: {
      success: true,
      faces: [
        {
          faceId: 'HIK_FACE_001',
          name: 'John Doe',
          createTime: '2025-08-06T10:30:00.000Z',
        },
        {
          faceId: 'HIK_FACE_002',
          name: 'Jane Smith',
          createTime: '2025-08-05T14:15:00.000Z',
        },
      ],
    },
  })
  async getHikvisionFaces(): Promise<{
    success: boolean;
    faces?: Array<{
      faceId: string;
      name: string;
      createTime: string;
    }>;
    error?: string;
  }> {
    return this.hikvisionService.getFaceList();
  }

  @Post('cleanup')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Clean up old face records',
    description: 'Remove old or inactive face records to optimize storage',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup operation result',
    example: {
      success: true,
      cleanedCount: 25,
    },
  })
  async cleanupOldRecords(): Promise<{ success: boolean; cleanedCount: number }> {
    const cleanedCount = await this.faceRecognitionService.cleanupOldRecords();
    return { success: true, cleanedCount };
  }

  @Post('snapshot')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({
    summary: 'Capture snapshot from camera',
    description: 'Take a snapshot from specified camera for testing or manual review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Camera snapshot result',
    example: {
      success: true,
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    },
  })
  async captureSnapshot(@Query('cameraId') cameraId?: string): Promise<{
    success: boolean;
    imageData?: string;
    error?: string;
  }> {
    return this.hikvisionService.captureSnapshot(cameraId);
  }

  @Post('setup-webhook')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Setup webhook for Hikvision device',
    description: 'Configure webhook endpoint on Hikvision device for real-time event notifications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook setup result',
    example: {
      success: true,
    },
  })
  async setupWebhook(): Promise<{ success: boolean; error?: string }> {
    const config = {
      webhookSecret: process.env.FACE_WEBHOOK_SECRET || 'your-webhook-secret',
      webhookEndpoint: process.env.FACE_WEBHOOK_ENDPOINT || '/api/face-recognition/webhook',
    };

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}${config.webhookEndpoint}`;

    return this.hikvisionService.setupWebhook(webhookUrl, config.webhookSecret);
  }
}
