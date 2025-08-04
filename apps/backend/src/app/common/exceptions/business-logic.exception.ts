import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@shared/constants';

export class BusinessLogicException extends HttpException {
  constructor(
    message: string,
    details?: any,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    const response = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    };

    super(response, statusCode);
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    const response = {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND_ERROR,
        message,
        timestamp: new Date().toISOString(),
      },
    };

    super(response, HttpStatus.NOT_FOUND);
  }
}

export class ResourceConflictException extends HttpException {
  constructor(resource: string, field: string, value: string) {
    const message = `${resource} with ${field} '${value}' already exists`;

    const response = {
      success: false,
      error: {
        code: ERROR_CODES.CONFLICT_ERROR,
        message,
        details: { field, value },
        timestamp: new Date().toISOString(),
      },
    };

    super(response, HttpStatus.CONFLICT);
  }
}

export class InsufficientPermissionsException extends HttpException {
  constructor(action: string, resource?: string) {
    const message = resource 
      ? `Insufficient permissions to ${action} ${resource}`
      : `Insufficient permissions to ${action}`;

    const response = {
      success: false,
      error: {
        code: ERROR_CODES.AUTHORIZATION_ERROR,
        message,
        timestamp: new Date().toISOString(),
      },
    };

    super(response, HttpStatus.FORBIDDEN);
  }
}

export class RateLimitExceededException extends HttpException {
  constructor(limit: number, windowMs: number) {
    const message = `Rate limit exceeded. Maximum ${limit} requests per ${windowMs / 1000} seconds`;

    const response = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        details: { limit, windowMs },
        timestamp: new Date().toISOString(),
      },
    };

    super(response, HttpStatus.TOO_MANY_REQUESTS);
  }
}