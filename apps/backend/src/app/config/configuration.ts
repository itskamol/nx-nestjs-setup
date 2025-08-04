import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  ssl: boolean;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface LoggingConfig {
  level: string;
  enableFileLogging: boolean;
  maxFiles: string;
  maxSize: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  corsOrigins: string[];
  database: DatabaseConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  logging: LoggingConfig;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env['PORT'] || '3000', 10),
    nodeEnv: process.env['NODE_ENV'] || 'development',
    apiPrefix: process.env['API_PREFIX'] || 'api',
    corsOrigins: process.env['CORS_ORIGINS']?.split(',') || ['http://localhost:3000'],

    database: {
      url:
        process.env['DATABASE_URL'] || 'postgresql://user:password@localhost:5432/nestjs_backend',
      maxConnections: parseInt(process.env['DATABASE_MAX_CONNECTIONS'] || '10', 10),
      ssl: process.env['DATABASE_SSL'] === 'true',
    },

    jwt: {
      secret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-in-production',
      expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
      refreshSecret:
        process.env['JWT_REFRESH_SECRET'] || 'your-super-secret-refresh-key-change-in-production',
      refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
    },

    redis: {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_DB'] || '0', 10),
    },

    logging: {
      level: process.env['LOG_LEVEL'] || 'info',
      enableFileLogging: process.env['ENABLE_FILE_LOGGING'] === 'true',
      maxFiles: process.env['LOG_MAX_FILES'] || '14d',
      maxSize: process.env['LOG_MAX_SIZE'] || '20m',
    },
  })
);
