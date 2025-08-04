import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { ThrottlerException } from '@nestjs/throttler';
import { ERROR_CODES } from '@shared/constants';
import { BusinessLogicException } from '../exceptions/business-logic.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly loggerService?: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error } = this.getErrorResponse(exception);

    const errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        requestId: request['requestId'],
      },
    };

    // Enhanced logging with structured data
    const logContext = {
      requestId: request['requestId'],
      method: request.method,
      url: request.url,
      statusCode: status,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id,
    };

    if (this.loggerService) {
      this.loggerService.logError(
        exception instanceof Error ? exception : new Error(String(exception)),
        'GlobalExceptionFilter',
        logContext
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${error.message}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    response.status(status).json(errorResponse);
  }

  private getErrorResponse(exception: unknown): {
    status: number;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  } {
    // Handle custom business logic exceptions
    if (exception instanceof BusinessLogicException) {
      const response = exception.getResponse() as any;
      return {
        status: exception.getStatus(),
        error: response.error,
      };
    }

    // Handle custom validation exceptions
    if (exception instanceof ValidationException) {
      const response = exception.getResponse() as any;
      return {
        status: exception.getStatus(),
        error: response.error,
      };
    }

    // Handle throttler exceptions (rate limiting)
    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: {
            retryAfter: '60 seconds',
          },
        },
      };
    }

    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      return {
        status,
        error: {
          code: this.getErrorCodeFromStatus(status),
          message:
            typeof response === 'string'
              ? response
              : (response as any).message || exception.message,
          details: typeof response === 'object' ? response : undefined,
        },
      };
    }

    // Handle Prisma known request errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaKnownError(exception);
    }

    // Handle Prisma validation errors
    if (exception instanceof PrismaClientValidationError) {
      return this.handlePrismaValidationError(exception);
    }

    // Handle JWT errors
    if (this.isJwtError(exception)) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        error: {
          code: ERROR_CODES.AUTHENTICATION_ERROR,
          message: 'Invalid or expired token',
          details:
            process.env['NODE_ENV'] === 'development' ? (exception as Error).message : undefined,
        },
      };
    }

    // Handle validation errors from class-validator
    if (this.isValidationError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: (exception as any).response?.error?.details || (exception as any).message,
        },
      };
    }

    // Handle timeout errors
    if (this.isTimeoutError(exception)) {
      return {
        status: HttpStatus.REQUEST_TIMEOUT,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout',
          details: {
            timeout: '30 seconds',
          },
        },
      };
    }

    // Handle unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error',
        details:
          process.env['NODE_ENV'] === 'development' ? (exception as Error).message : undefined,
      },
    };
  }

  private handlePrismaKnownError(exception: PrismaClientKnownRequestError): {
    status: number;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          error: {
            code: ERROR_CODES.CONFLICT_ERROR,
            message: 'A record with this data already exists',
            details: {
              field: exception.meta?.target,
            },
          },
        };

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: {
            code: ERROR_CODES.NOT_FOUND_ERROR,
            message: 'Record not found',
          },
        };

      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Foreign key constraint failed',
            details: {
              field: exception.meta?.field_name,
            },
          },
        };

      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid ID provided',
          },
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Database error occurred',
            details: process.env['NODE_ENV'] === 'development' ? exception.message : undefined,
          },
        };
    }
  }

  private handlePrismaValidationError(exception: PrismaClientValidationError): {
    status: number;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  } {
    return {
      status: HttpStatus.BAD_REQUEST,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Database validation error',
        details: process.env['NODE_ENV'] === 'development' ? exception.message : undefined,
      },
    };
  }

  private isJwtError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'JsonWebTokenError' ||
        exception.name === 'TokenExpiredError' ||
        exception.name === 'NotBeforeError' ||
        exception.message.includes('jwt'))
    );
  }

  private isTimeoutError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'TimeoutError' ||
        exception.message.includes('timeout') ||
        exception.message.includes('ETIMEDOUT'))
    );
  }

  private isValidationError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'ValidationError' ||
        (exception as any).response?.statusCode === HttpStatus.BAD_REQUEST ||
        (exception as any).response?.error?.code === ERROR_CODES.VALIDATION_ERROR)
    );
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.AUTHENTICATION_ERROR;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.AUTHORIZATION_ERROR;
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND_ERROR;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.CONFLICT_ERROR;
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }
}
