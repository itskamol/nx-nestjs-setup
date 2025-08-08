// src/hikvision/dto/hikvision.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

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

export class AssignPermissionDto {
  @ApiProperty({
    description: 'The ID of the door to assign permissions for.',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  doorId: number;

  @ApiProperty({
    description: 'The ID of the plan template to assign.',
    example: "1",
  })
  @IsString()
  @IsNotEmpty()
  planTemplateId: string;
}

export class CreatePermissionTemplateDto {
  @ApiProperty({
    description: 'Sozlanishi kerak bo\'lgan shablonning ID raqami (1-16 oraliqda).',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(16)
  templateId: number;

  @ApiProperty({
    description: 'Yaratilayotgan shablonga beriladigan nom.',
    example: '24/7 Ruxsat',
  })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  // Hozircha faqat 24/7 rejimini yaratishni soddalashtiramiz.
  // Murakkabroq jadvallar uchun bu yerga qo'shimcha maydonlar qo'shish mumkin.
}
