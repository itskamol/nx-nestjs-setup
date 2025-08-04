import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params, headers } = request;

    // Generate request ID for tracing
    const requestId = uuidv4();
    request['requestId'] = requestId;
    response.setHeader('X-Request-ID', requestId);

    const startTime = Date.now();
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip || request.socket.remoteAddress || '';

    // Log incoming request
    this.logger.logWithMeta(
      'info',
      'Incoming Request',
      {
        requestId,
        method,
        url,
        userAgent,
        ip,
        body: this.sanitizeBody(body),
        query,
        params,
      },
      'HTTP'
    );

    return next.handle().pipe(
      tap({
        next: data => {
          const responseTime = Date.now() - startTime;
          const { statusCode } = response;

          // Log successful response
          this.logger.logWithMeta(
            'info',
            'Request Completed',
            {
              requestId,
              method,
              url,
              statusCode,
              responseTime: `${responseTime}ms`,
              responseSize: JSON.stringify(data).length,
            },
            'HTTP'
          );
        },
        error: error => {
          const responseTime = Date.now() - startTime;
          const { statusCode } = response;

          // Log error response
          this.logger.logWithMeta(
            'error',
            'Request Failed',
            {
              requestId,
              method,
              url,
              statusCode: statusCode || 500,
              responseTime: `${responseTime}ms`,
              error: error.message,
              stack: error.stack,
            },
            'HTTP'
          );
        },
      })
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
