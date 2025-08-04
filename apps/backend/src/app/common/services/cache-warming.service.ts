import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { UsersService } from '../../users/users.service';
import { APP_CONSTANTS } from '@shared/constants';

export interface CacheWarmingConfig {
  enabled: boolean;
  strategies: CacheWarmingStrategy[];
  schedule?: string; // Cron expression
}

export interface CacheWarmingStrategy {
  name: string;
  enabled: boolean;
  priority: number; // 1-10, higher is more important
  warmFunction: () => Promise<void>;
  dependencies?: string[]; // Other strategies this depends on
}

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);
  private warmingStrategies: Map<string, CacheWarmingStrategy> = new Map();

  constructor(
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService
  ) {
    this.initializeStrategies();
  }

  async onModuleInit() {
    // Warm cache on application startup
    await this.warmCache();
  }

  private initializeStrategies() {
    // User statistics cache warming
    this.warmingStrategies.set('user-stats', {
      name: 'user-stats',
      enabled: true,
      priority: 8,
      warmFunction: async () => {
        try {
          // Warm user count by role
          const userStats = await this.getUserStatistics();
          await this.cacheService.set('stats:users:total', userStats.total, {
            ttl: APP_CONSTANTS.CACHE.DEFAULT_TTL * 4, // 20 minutes
          });
          await this.cacheService.set('stats:users:by-role', userStats.byRole, {
            ttl: APP_CONSTANTS.CACHE.DEFAULT_TTL * 4,
          });
          await this.cacheService.set('stats:users:active', userStats.active, {
            ttl: APP_CONSTANTS.CACHE.DEFAULT_TTL * 2, // 10 minutes
          });

          this.logger.debug('User statistics cache warmed');
        } catch (error) {
          this.logger.error('Failed to warm user statistics cache', error);
        }
      },
    });

    // Application metadata cache warming
    this.warmingStrategies.set('app-metadata', {
      name: 'app-metadata',
      enabled: true,
      priority: 5,
      warmFunction: async () => {
        try {
          const metadata = {
            version: process.env['npm_package_version'] || '1.0.0',
            environment: process.env['NODE_ENV'] || 'development',
            startTime: new Date().toISOString(),
          };

          await this.cacheService.set('app:metadata', metadata, {
            ttl: 3600, // 1 hour
          });

          this.logger.debug('Application metadata cache warmed');
        } catch (error) {
          this.logger.error('Failed to warm application metadata cache', error);
        }
      },
    });

    // Health check cache warming
    this.warmingStrategies.set('health-check', {
      name: 'health-check',
      enabled: true,
      priority: 9,
      warmFunction: async () => {
        try {
          // Pre-warm health check data
          const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
              database: 'healthy',
              cache: 'healthy',
            },
          };

          await this.cacheService.set('health:basic', healthData, {
            ttl: 60, // 1 minute
          });

          this.logger.debug('Health check cache warmed');
        } catch (error) {
          this.logger.error('Failed to warm health check cache', error);
        }
      },
    });

    // Frequently accessed users cache warming
    this.warmingStrategies.set('frequent-users', {
      name: 'frequent-users',
      enabled: true,
      priority: 6,
      warmFunction: async () => {
        try {
          // Get recently active users and cache them
          const recentUsers = await this.usersService.findAll({
            page: 1,
            limit: 20,
            isActive: true,
          });

          for (const user of recentUsers.data || []) {
            await this.cacheService.set(`user:${user.id}`, user, {
              ttl: APP_CONSTANTS.CACHE.USER_CACHE_TTL,
            });
          }

          this.logger.debug(`Warmed cache for ${recentUsers.data?.length || 0} frequent users`);
        } catch (error) {
          this.logger.error('Failed to warm frequent users cache', error);
        }
      },
      dependencies: ['user-stats'],
    });
  }

  async warmCache(strategyNames?: string[]): Promise<void> {
    this.logger.log('Starting cache warming process...');

    const strategiesToRun = strategyNames
      ? Array.from(this.warmingStrategies.values()).filter(s => strategyNames.includes(s.name))
      : Array.from(this.warmingStrategies.values());

    // Sort by priority (higher priority first)
    const sortedStrategies = strategiesToRun
      .filter(s => s.enabled)
      .sort((a, b) => b.priority - a.priority);

    const results = {
      successful: 0,
      failed: 0,
      total: sortedStrategies.length,
    };

    for (const strategy of sortedStrategies) {
      try {
        this.logger.debug(`Running cache warming strategy: ${strategy.name}`);
        await strategy.warmFunction();
        results.successful++;
      } catch (error) {
        this.logger.error(`Cache warming strategy '${strategy.name}' failed`, error);
        results.failed++;
      }
    }

    this.logger.log(
      `Cache warming completed: ${results.successful}/${results.total} strategies successful`
    );
  }

  async invalidateCache(patterns: string[]): Promise<void> {
    this.logger.log(`Invalidating cache patterns: ${patterns.join(', ')}`);

    for (const pattern of patterns) {
      try {
        const keys = await this.cacheService.keys(pattern);
        if (keys.success && keys.data) {
          for (const key of keys.data) {
            await this.cacheService.del(key);
          }
          this.logger.debug(`Invalidated ${keys.data.length} keys for pattern: ${pattern}`);
        }
      } catch (error) {
        this.logger.error(`Failed to invalidate cache pattern: ${pattern}`, error);
      }
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateCache([`user:${userId}`, `user:${userId}:*`, 'stats:users:*']);
  }

  async invalidateAllUserCaches(): Promise<void> {
    await this.invalidateCache(['user:*', 'stats:users:*']);
  }

  async scheduleWarmup(strategyName: string, delayMs: number): Promise<void> {
    setTimeout(async () => {
      await this.warmCache([strategyName]);
    }, delayMs);
  }

  getWarmingStrategies(): CacheWarmingStrategy[] {
    return Array.from(this.warmingStrategies.values());
  }

  enableStrategy(strategyName: string): void {
    const strategy = this.warmingStrategies.get(strategyName);
    if (strategy) {
      strategy.enabled = true;
      this.logger.log(`Enabled cache warming strategy: ${strategyName}`);
    }
  }

  disableStrategy(strategyName: string): void {
    const strategy = this.warmingStrategies.get(strategyName);
    if (strategy) {
      strategy.enabled = false;
      this.logger.log(`Disabled cache warming strategy: ${strategyName}`);
    }
  }

  private async getUserStatistics() {
    // This would typically be more complex queries
    const [total, activeUsers, usersByRole] = await Promise.all([
      this.usersService.findAll({ page: 1, limit: 1 }),
      this.usersService.findAll({ page: 1, limit: 1, isActive: true }),
      Promise.all([
        this.usersService.findAll({ page: 1, limit: 1, role: 'USER' }),
        this.usersService.findAll({ page: 1, limit: 1, role: 'ADMIN' }),
        this.usersService.findAll({ page: 1, limit: 1, role: 'MODERATOR' }),
      ]),
    ]);

    return {
      total: total.pagination?.total || 0,
      active: activeUsers.pagination?.total || 0,
      byRole: {
        USER: usersByRole[0].pagination?.total || 0,
        ADMIN: usersByRole[1].pagination?.total || 0,
        MODERATOR: usersByRole[2].pagination?.total || 0,
      },
    };
  }
}
