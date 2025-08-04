import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { APP_CONSTANTS } from '@shared/constants';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    minLength: APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH,
    maxLength: APP_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
  })
  @MaxLength(APP_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH, {
    message: `Password must not exceed ${APP_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH} characters`,
  })
  password: string;

  @ApiPropertyOptional({
    description: 'User first name',
    maxLength: APP_CONSTANTS.VALIDATION.NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(APP_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, {
    message: `First name must not exceed ${APP_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} characters`,
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    maxLength: APP_CONSTANTS.VALIDATION.NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(APP_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, {
    message: `Last name must not exceed ${APP_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} characters`,
  })
  lastName?: string;
}