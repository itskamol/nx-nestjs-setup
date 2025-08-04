import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    memory: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService
  ) { }

  async getHealthStatus(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    const [databaseHealth, cacheHealth, memoryHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      this.checkMemoryHealth(),
    ]);

    const services = {
      database: databaseHealth,
      cache: cacheHealth,
      memory: memoryHealth,
    };

    // Determine overall status
    const unhealthyServices = Object.values(services).filter(
      service => service.status === 'unhealthy'
    );

    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (unhealthyServices.length === 0) {
      status = 'healthy';
    } else if (unhealthyServices.length === Object.keys(services).length) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      timestamp,
      uptime,
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      services,
    };
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      const isHealthy = await this.prismaService.healthCheck();
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        return {
          status: 'healthy',
          responseTime,
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: 'Database health check failed',
        };
      }
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkCacheHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      const isHealthy = await this.cacheService.healthCheck();
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        return {
          status: 'healthy',
          responseTime,
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: 'Cache health check failed',
        };
      }
    } catch (error) {
      this.logger.error('Cache health check failed', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown cache error',
      };
    }
  }

  private async checkMemoryHealth(): Promise<ServiceHealth> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // Consider memory unhealthy if usage is above 90%
      const isHealthy = memoryUsagePercent < 90;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent),
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        error: isHealthy ? undefined : 'High memory usage detected',
      };
    } catch (error) {
      this.logger.error('Memory health check failed', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown memory error',
      };
    }
  }

  async getDetailedHealthStatus(): Promise<HealthCheckResult & {
    system: {
      nodeVersion: string;
      platform: string;
      arch: string;
      cpuUsage: NodeJS.CpuUsage;
    };
  }> {
    const basicHealth = await this.getHealthStatus();

    return {
      ...basicHealth,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuUsage: process.cpuUsage(),
      },
    };
  }

  async isHealthy(): Promise<boolean> {
    const health = await this.getHealthStatus();
    return health.status === 'healthy';
  }
}