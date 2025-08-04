import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/config.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface CacheResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;

  constructor(private readonly configService: AppConfigService) {}

  async onModuleInit() {
    try {
      const redisConfig = this.configService.redis;

      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
      });

      // Event listeners
      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis server');
      });

      this.redis.on('ready', () => {
        this.logger.log('Redis connection is ready');
      });

      this.redis.on('error', error => {
        this.logger.error('Redis connection error', error.stack);
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('Reconnecting to Redis...');
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis connection', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.logger.log('Redis connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing Redis connection', error);
    }
  }

  async get<T = any>(key: string, options?: CacheOptions): Promise<CacheResponse<T>> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return { success: true, data: undefined };
      }

      const parsedValue = JSON.parse(value);
      return { success: true, data: parsedValue };
    } catch (error) {
      this.logger.error(`Failed to get cache key: ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async set<T = any>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<CacheResponse<boolean>> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const serializedValue = JSON.stringify(value);

      if (options?.ttl) {
        await this.redis.setex(fullKey, options.ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      return { success: true, data: true };
    } catch (error) {
      this.logger.error(`Failed to set cache key: ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async del(key: string, options?: CacheOptions): Promise<CacheResponse<number>> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.del(fullKey);
      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<CacheResponse<boolean>> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.exists(fullKey);
      return { success: true, data: result === 1 };
    } catch (error) {
      this.logger.error(`Failed to check cache key existence: ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async ttl(key: string, options?: CacheOptions): Promise<CacheResponse<number>> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.ttl(fullKey);
      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Failed to get TTL for cache key: ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async expire(key: string, ttl: number, options?: CacheOptions): Promise<CacheResponse<boolean>> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return { success: true, data: result === 1 };
    } catch (error) {
      this.logger.error(`Failed to set expiration for cache key: ${key}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async flush(): Promise<CacheResponse<boolean>> {
    try {
      await this.redis.flushdb();
      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to flush cache', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async keys(pattern: string): Promise<CacheResponse<string[]>> {
    try {
      const keys = await this.redis.keys(pattern);
      return { success: true, data: keys };
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern: ${pattern}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  // Helper method to build cache keys with optional prefix
  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}:${key}`;
    }
    return key;
  }

  // Get Redis client for advanced operations
  getClient(): Redis {
    return this.redis;
  }
}
