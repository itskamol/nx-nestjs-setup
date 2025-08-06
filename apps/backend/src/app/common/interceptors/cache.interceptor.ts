import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache/cache.service';
import {
  CACHE_KEY_METADATA,
  CACHE_PREFIX_METADATA,
  CACHE_TTL_METADATA,
} from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const cacheTtl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());
    const cachePrefix = this.reflector.get<string>(CACHE_PREFIX_METADATA, context.getHandler());

    // If no cache metadata, skip caching
    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const fullCacheKey = this.buildCacheKey(cacheKey, cachePrefix, request);

    try {
      // Try to get from cache
      const cachedResult = await this.cacheService.get(fullCacheKey);

      if (cachedResult.success && cachedResult.data !== undefined) {
        this.logger.debug(`Cache hit for key: ${fullCacheKey}`);
        return of(cachedResult.data);
      }

      this.logger.debug(`Cache miss for key: ${fullCacheKey}`);

      // If not in cache, execute the handler and cache the result
      return next.handle().pipe(
        tap(async data => {
          try {
            await this.cacheService.set(fullCacheKey, data, {
              ttl: cacheTtl,
              prefix: cachePrefix,
            });
            this.logger.debug(`Cached result for key: ${fullCacheKey}`);
          } catch (error) {
            this.logger.error(`Failed to cache result for key: ${fullCacheKey}`, error);
          }
        })
      );
    } catch (error) {
      this.logger.error(`Cache error for key: ${fullCacheKey}`, error);
      // If cache fails, continue without caching
      return next.handle();
    }
  }

  private buildCacheKey(baseKey: string, prefix: string, request: any): string {
    // Include relevant request parameters in cache key
    const userId = request.user?.id || 'anonymous';
    const method = request.method;
    const url = request.url;
    const queryParams = JSON.stringify(request.query || {});

    // Create a unique cache key based on the request context
    const contextKey = `${method}:${url}:${queryParams}:${userId}`;
    const hashedContext = this.hashString(contextKey);

    return `${prefix}:${baseKey}:${hashedContext}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }
}
