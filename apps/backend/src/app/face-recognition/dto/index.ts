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
  @ApiProperty({ description: 'User ID to associate with face record' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Hikvision face ID' })
  @IsString()
  faceId: string;

  @ApiProperty({ description: 'Base64 encoded face image' })
  @IsString()
  imageData: string;

  @ApiProperty({ description: 'Face features/template data' })
  @IsString()
  faceData: string;

  @ApiProperty({ description: 'Recognition confidence score' })
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

  @ApiProperty({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
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
  @ApiProperty({ description: 'Webhook event type' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Face ID' })
  @IsString()
  faceId: string;

  @ApiProperty({ description: 'Recognition confidence' })
  @IsNumber()
  confidence: number;

  @ApiProperty({ description: 'Timestamp of event' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Camera information' })
  @IsOptional()
  camera?: {
    id: string;
    name: string;
    location?: string;
  };

  @ApiProperty({ description: 'Event image data' })
  @IsOptional()
  imageData?: string;

  @ApiProperty({ description: 'Webhook signature for validation' })
  @IsString()
  signature: string;
}
