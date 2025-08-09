import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class HeartbeatDto {
  @ApiProperty({ description: 'The unique ID of the device sending the heartbeat', example: 'DS-12345' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
