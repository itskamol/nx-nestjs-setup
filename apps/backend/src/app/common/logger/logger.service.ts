import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor(private readonly configService: AppConfigService) {
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const { level, enableFileLogging, maxFiles, maxSize } = this.configService.logging;
    const isDevelopment = this.configService.isDevelopment;

    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.colorize({ all: isDevelopment }),
          winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
            const contextStr = context ? `[${context}] ` : '';
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            const traceStr = trace ? `\n${trace}` : '';
            return `${timestamp} ${level}: ${contextStr}${message}${metaStr}${traceStr}`;
          })
        ),
      })
    );

    // File transports (if enabled)
    if (enableFileLogging) {
      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles,
          maxSize,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
        })
      );

      // Combined logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles,
          maxSize,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
        })
      );
    }

    return winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exitOnError: false,
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Additional methods for structured logging
  logWithMeta(level: string, message: string, meta: any, context?: string) {
    this.logger.log(level, message, { ...meta, context });
  }

  logRequest(method: string, url: string, statusCode: number, responseTime: number, context?: string) {
    this.logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      context: context || 'HTTP',
    });
  }

  logError(error: Error, context?: string, additionalInfo?: any) {
    this.logger.error(error.message, {
      context,
      stack: error.stack,
      ...additionalInfo,
    });
  }
}