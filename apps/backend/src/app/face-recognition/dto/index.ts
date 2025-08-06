import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Import query DTOs
export * from './query.dto';

export enum FaceEventType {
  DETECTED = 'DETECTED',
  RECOGNIZED = 'RECOGNIZED',
  UNKNOWN = 'UNKNOWN',
  ENROLLED = 'ENROLLED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}

export class CreateFaceRecordDto {
  @ApiProperty({
    description: 'User ID to associate with face record',
    example: 'u47ac10b-58cc-4372-a567-0e02b2c3d479',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Hikvision face ID',
    example: 'HIK_FACE_001',
  })
  @IsString()
  faceId: string;

  @ApiProperty({
    description: 'Base64 encoded face image',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
  })
  @IsString()
  imageData: string;

  @ApiProperty({
    description: 'Face features/template data',
    example: 'FACE_TEMPLATE_DATA_BASE64_ENCODED',
  })
  @IsString()
  faceData: string;

  @ApiProperty({
    description: 'Recognition confidence score',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class FaceRecognitionEventDto {
  @ApiProperty({ description: 'Face record ID' })
  @IsString()
  @IsOptional()
  faceRecordId?: string;

  @ApiProperty({ description: 'Face ID from Hikvision' })
  @IsString()
  @IsOptional()
  faceId?: string;

  @ApiProperty({ enum: FaceEventType, description: 'Event type' })
  @IsEnum(FaceEventType)
  eventType: FaceEventType;

  @ApiProperty({ description: 'Recognition confidence score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Camera ID' })
  @IsString()
  @IsOptional()
  cameraId?: string;

  @ApiProperty({ description: 'Location description' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Base64 encoded event image' })
  @IsString()
  @IsOptional()
  imageData?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { temperature: 36.5, doorId: 'D001' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class FaceRecognitionConfigDto {
  @ApiProperty({ description: 'Hikvision camera host' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'Hikvision camera port' })
  @IsNumber()
  port: number;

  @ApiProperty({ description: 'Hikvision username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Hikvision password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Webhook secret for validation' })
  @IsString()
  webhookSecret: string;

  @ApiProperty({ description: 'Webhook endpoint URL' })
  @IsString()
  webhookEndpoint: string;

  @ApiProperty({ description: 'Data retention days' })
  @IsNumber()
  @Min(1)
  retentionDays: number;

  @ApiProperty({ description: 'Maximum records to store' })
  @IsNumber()
  @Min(1)
  maxRecords: number;
}

export class FaceWebhookDto {
  @ApiProperty({
    description: 'Webhook event type',
    example: 'FACE_DETECTED',
  })
  @IsString()
  eventType: string;

  @ApiProperty({
    description: 'Face ID',
    example: 'HIK_FACE_001',
  })
  @IsString()
  faceId: string;

  @ApiProperty({
    description: 'Recognition confidence',
    example: 0.92,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  confidence: number;

  @ApiProperty({
    description: 'Timestamp of event',
    example: '2025-08-06T10:30:00.000Z',
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    description: 'Camera information',
    example: {
      id: 'CAM_001',
      name: 'Main Entrance Camera',
      location: 'Main Entrance',
    },
    required: false,
  })
  @IsOptional()
  camera?: {
    id: string;
    name: string;
    location?: string;
  };

  @ApiProperty({
    description: 'Event image data',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    required: false,
  })
  @IsOptional()
  imageData?: string;

  @ApiProperty({
    description: 'Webhook signature for validation',
    example: 'sha256=a8b7c9d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4',
  })
  @IsString()
  signature: string;
}

export class UpdateFaceRecordDto {
  @ApiProperty({
    description: 'User ID to associate with face record',
    example: 'u47ac10b-58cc-4372-a567-0e02b2c3d479',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Updated face image data',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageData?: string;

  @ApiProperty({
    description: 'Updated face features/template data',
    example: 'UPDATED_FACE_TEMPLATE_DATA_BASE64',
    required: false,
  })
  @IsString()
  @IsOptional()
  faceData?: string;

  @ApiProperty({
    description: 'Updated recognition confidence score',
    example: 0.97,
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidence?: number;

  @ApiProperty({
    description: 'Active status of face record',
    example: true,
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}
