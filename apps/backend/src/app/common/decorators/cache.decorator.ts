import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_PREFIX_METADATA = 'cache:prefix';
export const CACHE_STRATEGY_METADATA = 'cache:strategy';

export type CacheStrategy = 'standard' | 'user-specific' | 'global' | 'time-based';

export interface CacheDecoratorOptions {
  key?: string;
  ttl?: number;
  prefix?: string;
  strategy?: CacheStrategy;
}

/**
 * Cache decorator to automatically cache method results
 * @param options Cache configuration options
 */
export const Cache = (options: CacheDecoratorOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Set metadata for the cache interceptor to use
    SetMetadata(CACHE_KEY_METADATA, options.key || propertyKey)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_METADATA, options.ttl || 300)(target, propertyKey, descriptor); // Default 5 minutes
    SetMetadata(CACHE_PREFIX_METADATA, options.prefix || target.constructor.name)(target, propertyKey, descriptor);
    SetMetadata(CACHE_STRATEGY_METADATA, options.strategy || 'standard')(target, propertyKey, descriptor);
    
    return descriptor;
  };
};

/**
 * Cache user-specific data (includes user ID in cache key)
 */
export const CacheUserSpecific = (options: Omit<CacheDecoratorOptions, 'strategy'> = {}) => {
  return Cache({ ...options, strategy: 'user-specific' });
};

/**
 * Cache global data (same for all users)
 */
export const CacheGlobal = (options: Omit<CacheDecoratorOptions, 'strategy'> = {}) => {
  return Cache({ ...options, strategy: 'global' });
};

/**
 * Cache with time-based invalidation (includes timestamp in cache key)
 */
export const CacheTimeBased = (options: Omit<CacheDecoratorOptions, 'strategy'> = {}) => {
  return Cache({ ...options, strategy: 'time-based' });
};

/**
 * Short-term cache (1 minute TTL)
 */
export const CacheShort = (options: Omit<CacheDecoratorOptions, 'ttl'> = {}) => {
  return Cache({ ...options, ttl: 60 });
};

/**
 * Medium-term cache (15 minutes TTL)
 */
export const CacheMedium = (options: Omit<CacheDecoratorOptions, 'ttl'> = {}) => {
  return Cache({ ...options, ttl: 900 });
};

/**
 * Long-term cache (1 hour TTL)
 */
export const CacheLong = (options: Omit<CacheDecoratorOptions, 'ttl'> = {}) => {
  return Cache({ ...options, ttl: 3600 });
};