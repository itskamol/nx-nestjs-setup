import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class CreateEventListenerDto {
  @ApiProperty()
  @IsArray()
  @IsNumber({}, { each: true })
  devices: number[];

  @ApiProperty()
  @IsString()
  url: string;
}
