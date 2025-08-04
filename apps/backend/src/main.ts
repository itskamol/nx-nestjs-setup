import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { NestWinstonLogger } from './app/common/logger/nest-logger.service';
import { GlobalExceptionFilter } from './app/common/filters/global-exception.filter';
import { LoggingInterceptor } from './app/common/interceptors/logging.interceptor';
import { TransformInterceptor } from './app/common/interceptors/transform.interceptor';
import { AppConfigService } from './app/config/config.service';
import { PrismaService } from './app/database/prisma.service';

async function bootstrap() {
  // Create NestJS application with custom logger
  const app = await NestFactory.create(AppModule, {
    logger: new NestWinstonLogger(),
  });

  // Get configuration service
  const configService = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for API
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.enableCors({
    origin: configService.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(configService.apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.isProduction,
    })
  );

  // Global filters and interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor()
  );

  // Swagger documentation (only in development)
  if (configService.isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('NestJS Backend API')
      .setDescription('A production-ready NestJS backend with best practices')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${configService.apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`📚 Swagger documentation available at: http://localhost:${configService.port}/${configService.apiPrefix}/docs`);
  }

  // Prisma shutdown hooks
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Start the application
  await app.listen(configService.port);

  logger.log(`🚀 Application is running on: http://localhost:${configService.port}/${configService.apiPrefix}`);
  logger.log(`🌍 Environment: ${configService.nodeEnv}`);
}

bootstrap().catch((error) => {
  Logger.error('❌ Error starting server', error);
  process.exit(1);
});
