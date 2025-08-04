import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { APP_CONSTANTS } from '@shared/constants';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'User password',
    minLength: APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @MinLength(APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${APP_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
  })
  password!: string;
}