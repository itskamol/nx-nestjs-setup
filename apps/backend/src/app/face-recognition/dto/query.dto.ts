import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FaceRecognitionQueryDto {
  @ApiProperty({ description: 'Filter by user ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Filter by face ID', required: false })
  @IsString()
  @IsOptional()
  faceId?: string;

  @ApiProperty({
    description: 'Filter by event type',
    required: false,
    enum: ['DETECTED', 'RECOGNIZED', 'UNKNOWN'],
  })
  @IsEnum(['DETECTED', 'RECOGNIZED', 'UNKNOWN'])
  @IsOptional()
  eventType?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ description: 'Start date filter', required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date filter', required: false })
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class UpdateFaceRecordDto {
  @ApiProperty({ description: 'User ID to associate with face record', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Face recognition status', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Face features/template data', required: false })
  @IsString()
  @IsOptional()
  faceData?: string;

  @ApiProperty({ description: 'Recognition confidence score', required: false })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidence?: number;
}
