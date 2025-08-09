import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { Transform, plainToClass } from 'class-transformer';

export class EnvironmentVariables {
  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  @IsString()
  @IsIn(['development', 'staging', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsString()
  API_PREFIX: string = 'api';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000';

  // Database configuration
  @IsString()
  DATABASE_URL: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DATABASE_MAX_CONNECTIONS: number = 10;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DATABASE_SSL: boolean = false;

  // JWT configuration
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // Redis configuration
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @Min(0)
  @Max(15)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REDIS_DB: number = 0;

  // Logging configuration
  @IsString()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  ENABLE_FILE_LOGGING: boolean = false;

  @IsString()
  @IsOptional()
  LOG_MAX_FILES: string = '14d';

  @IsString()
  @IsOptional()
  LOG_MAX_SIZE: string = '20m';
}

export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints;
      return `${error.property}: ${Object.values(constraints || {}).join(', ')}`;
    });

    throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
  }

  return validatedConfig;
}
