import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '@shared/constants';

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let code: string = ERROR_CODES.AUTHENTICATION_ERROR;
    let message = 'Authentication failed';
    let details: any;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as { message?: string; error?: string; details?: any };
      message = res.message || message;
      details = res.details;
    }

    if (status === HttpStatus.CONFLICT) {
      code = ERROR_CODES.CONFLICT_ERROR;
    } else if (status === HttpStatus.BAD_REQUEST) {
      code = ERROR_CODES.VALIDATION_ERROR;
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
