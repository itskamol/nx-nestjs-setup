import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ description: 'A human-readable name for the device', example: 'Main Entrance Camera' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'A unique ID or serial number for the device', example: 'DS-12345' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ description: 'The physical location of the device', example: 'Building A, 1st Floor' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'The IP address of the device', example: '192.168.1.101' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

export class DeviceResponseDto {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    deviceId: string;
    @ApiProperty()
    location: string;
    @ApiProperty()
    ipAddress: string;
    @ApiProperty()
    status: string;
    @ApiProperty()
    firmwareVersion: string;
    @ApiProperty()
    lastSeenAt: Date;
    @ApiProperty()
    createdAt: Date;
    @ApiProperty()
    updatedAt: Date;
}

export class CreateDeviceResponseDto extends DeviceResponseDto {
  @ApiProperty({ description: 'The generated API key for the device. This is only returned on creation.'})
  apiKey: string;
}
