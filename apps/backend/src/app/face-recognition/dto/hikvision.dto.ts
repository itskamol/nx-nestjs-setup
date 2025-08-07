// src/hikvision/dto/hikvision.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({
    description: 'A unique identifier for the person (e.g., employee ID).',
    example: 'EMP12345',
  })
  @IsString()
  @IsNotEmpty()
  employeeNo: string;

  @ApiProperty({
    description: 'The full name of the person.',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The type of user being created.',
    enum: ['normal', 'visitor'],
    default: 'normal',
  })
  @IsEnum(['normal', 'visitor'])
  @IsOptional()
  userType?: 'normal' | 'visitor';
}

export class SetListenerDto {
  @ApiProperty({
    description: 'The full URL of your backend service that will receive event notifications.',
    example: 'http://yourapi.com/api/face-recognition/webhook/isapi',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}