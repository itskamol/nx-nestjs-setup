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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { FaceRecognitionService } from '../services/face-recognition.service';
import { HikvisionService } from '../services/hikvision.service';
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
import { Public } from '../../common/decorators/public.decorator';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('face-recognition')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Enroll a new face for recognition' })
  @ApiResponse({ status: HttpStatus.CREATED, type: FaceRecordEntity })
  async enrollFace(
    @Body() createFaceRecordDto: CreateFaceRecordDto,
    @Body('options') options?: { name?: string; gender?: string; age?: number }
  ): Promise<FaceRecordEntity> {
    return this.faceRecognitionService.enrollFace(createFaceRecordDto, options);
  }

  @Post('recognize')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Recognize faces from image' })
  @ApiConsumes('multipart/form-data')
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
  @ApiOperation({ summary: 'Recognize faces from base64 image data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Face recognition results' })
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
  @ApiOperation({ summary: 'Get face records with pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated face records' })
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
  @ApiOperation({ summary: 'Get face recognition events' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated events' })
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
  @ApiOperation({ summary: 'Get face recognition statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: FaceRecognitionStatsEntity })
  async getStats(): Promise<FaceRecognitionStatsEntity> {
    return this.faceRecognitionService.getStats();
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle webhook events from Hikvision' })
  @ApiResponse({ status: HttpStatus.OK })
  async handleWebhook(@Body() webhookDto: FaceWebhookDto): Promise<{ success: boolean }> {
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
  @ApiOperation({ summary: 'Test connection to Hikvision device' })
  @ApiResponse({ status: HttpStatus.OK })
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    const isConnected = await this.hikvisionService.testConnection();
    return {
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed',
    };
  }

  @Get('faces/list')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get list of faces from Hikvision device' })
  @ApiResponse({ status: HttpStatus.OK })
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
  @ApiOperation({ summary: 'Clean up old face records' })
  @ApiResponse({ status: HttpStatus.OK })
  async cleanupOldRecords(): Promise<{ success: boolean; cleanedCount: number }> {
    const cleanedCount = await this.faceRecognitionService.cleanupOldRecords();
    return { success: true, cleanedCount };
  }

  @Post('snapshot')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Capture snapshot from camera' })
  @ApiResponse({ status: HttpStatus.OK })
  async captureSnapshot(@Query('cameraId') cameraId?: string): Promise<{
    success: boolean;
    imageData?: string;
    error?: string;
  }> {
    return this.hikvisionService.captureSnapshot(cameraId);
  }

  @Post('setup-webhook')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Setup webhook for Hikvision device' })
  @ApiResponse({ status: HttpStatus.OK })
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
