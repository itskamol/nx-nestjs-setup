import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface ErrorMetrics {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByEndpoint: Record<string, number>;
    recentErrors: ErrorEvent[];
    errorRate: number; // errors per minute
}

export interface ErrorEvent {
    id: string;
    timestamp: string;
    type: string;
    message: string;
    endpoint: string;
    method: string;
    statusCode: number;
    userId?: string;
    requestId?: string;
    stack?: string;
    userAgent?: string;
    ip?: string;
}

export interface AlertThreshold {
    errorRate: number; // errors per minute
    consecutiveErrors: number;
    criticalEndpoints: string[];
}

@Injectable()
export class ErrorMonitoringService {
    private readonly logger = new Logger(ErrorMonitoringService.name);
    private readonly errorCachePrefix = 'error_monitoring';
    private readonly metricsWindow = 60 * 60 * 1000; // 1 hour in milliseconds
    private readonly maxRecentErrors = 100;

    private readonly defaultThresholds: AlertThreshold = {
        errorRate: 10, // 10 errors per minute
        consecutiveErrors: 5,
        criticalEndpoints: ['/auth/login', '/auth/register', '/users'],
    };

    constructor(private readonly cacheService: CacheService) { }

    async recordError(errorEvent: Omit<ErrorEvent, 'id' | 'timestamp'>): Promise<void> {
        try {
            const event: ErrorEvent = {
                ...errorEvent,
                id: this.generateErrorId(),
                timestamp: new Date().toISOString(),
            };

            // Store the error event
            await this.storeErrorEvent(event);

            // Update metrics
            await this.updateMetrics(event);

            // Check for alerts
            await this.checkAlertThresholds(event);

            this.logger.debug(`Error recorded: ${event.type} - ${event.message}`);
        } catch (error) {
            this.logger.error('Failed to record error event', error);
        }
    }

    async getErrorMetrics(timeWindow?: number): Promise<ErrorMetrics> {
        try {
            const window = timeWindow || this.metricsWindow;
            const cutoffTime = Date.now() - window;

            const recentErrors = await this.getRecentErrors();
            const filteredErrors = recentErrors.filter(
                error => new Date(error.timestamp).getTime() > cutoffTime
            );

            const totalErrors = filteredErrors.length;
            const errorsByType: Record<string, number> = {};
            const errorsByEndpoint: Record<string, number> = {};

            filteredErrors.forEach(error => {
                // Count by type
                errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;

                // Count by endpoint
                errorsByEndpoint[error.endpoint] = (errorsByEndpoint[error.endpoint] || 0) + 1;
            });

            // Calculate error rate (errors per minute)
            const windowMinutes = window / (60 * 1000);
            const errorRate = totalErrors / windowMinutes;

            return {
                totalErrors,
                errorsByType,
                errorsByEndpoint,
                recentErrors: filteredErrors.slice(0, this.maxRecentErrors),
                errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
            };
        } catch (error) {
            this.logger.error('Failed to get error metrics', error);
            return {
                totalErrors: 0,
                errorsByType: {},
                errorsByEndpoint: {},
                recentErrors: [],
                errorRate: 0,
            };
        }
    }

    async getErrorTrends(hours: number = 24): Promise<{
        hourlyErrorCounts: Array<{ hour: string; count: number }>;
        topErrorTypes: Array<{ type: string; count: number }>;
        topErrorEndpoints: Array<{ endpoint: string; count: number }>;
    }> {
        try {
            const recentErrors = await this.getRecentErrors();
            const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

            const filteredErrors = recentErrors.filter(
                error => new Date(error.timestamp).getTime() > cutoffTime
            );

            // Group by hour
            const hourlyErrorCounts: Array<{ hour: string; count: number }> = [];
            const hourCounts: Record<string, number> = {};

            filteredErrors.forEach(error => {
                const hour = new Date(error.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });

            Object.entries(hourCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([hour, count]) => {
                    hourlyErrorCounts.push({ hour, count });
                });

            // Top error types
            const typeCounts: Record<string, number> = {};
            filteredErrors.forEach(error => {
                typeCounts[error.type] = (typeCounts[error.type] || 0) + 1;
            });

            const topErrorTypes = Object.entries(typeCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([type, count]) => ({ type, count }));

            // Top error endpoints
            const endpointCounts: Record<string, number> = {};
            filteredErrors.forEach(error => {
                endpointCounts[error.endpoint] = (endpointCounts[error.endpoint] || 0) + 1;
            });

            const topErrorEndpoints = Object.entries(endpointCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([endpoint, count]) => ({ endpoint, count }));

            return {
                hourlyErrorCounts,
                topErrorTypes,
                topErrorEndpoints,
            };
        } catch (error) {
            this.logger.error('Failed to get error trends', error);
            return {
                hourlyErrorCounts: [],
                topErrorTypes: [],
                topErrorEndpoints: [],
            };
        }
    }

    async clearErrorHistory(): Promise<void> {
        try {
            const cacheKey = `${this.errorCachePrefix}:recent_errors`;
            await this.cacheService.del(cacheKey);
            this.logger.log('Error history cleared');
        } catch (error) {
            this.logger.error('Failed to clear error history', error);
        }
    }

    private async storeErrorEvent(event: ErrorEvent): Promise<void> {
        const cacheKey = `${this.errorCachePrefix}:recent_errors`;

        // Get existing errors
        const existingErrors = await this.getRecentErrors();

        // Add new error to the beginning
        const updatedErrors = [event, ...existingErrors].slice(0, this.maxRecentErrors);

        // Store back to cache
        await this.cacheService.set(cacheKey, updatedErrors, {
            ttl: 24 * 60 * 60, // 24 hours
        });
    }

    private async getRecentErrors(): Promise<ErrorEvent[]> {
        const cacheKey = `${this.errorCachePrefix}:recent_errors`;
        const result = await this.cacheService.get<ErrorEvent[]>(cacheKey);
        return result.success ? result.data || [] : [];
    }

    private async updateMetrics(event: ErrorEvent): Promise<void> {
        // Update error counters
        const typeCounterKey = `${this.errorCachePrefix}:type:${event.type}`;
        const endpointCounterKey = `${this.errorCachePrefix}:endpoint:${event.endpoint}`;

        // Increment counters (these will expire after 1 hour)
        await Promise.all([
            this.incrementCounter(typeCounterKey),
            this.incrementCounter(endpointCounterKey),
        ]);
    }

    private async incrementCounter(key: string): Promise<void> {
        try {
            const result = await this.cacheService.get<number>(key);
            const currentCount = result.success ? result.data || 0 : 0;
            await this.cacheService.set(key, currentCount + 1, {
                ttl: 60 * 60, // 1 hour
            });
        } catch (error) {
            this.logger.error(`Failed to increment counter: ${key}`, error);
        }
    }

    private async checkAlertThresholds(event: ErrorEvent): Promise<void> {
        try {
            const metrics = await this.getErrorMetrics(5 * 60 * 1000); // Last 5 minutes

            // Check error rate threshold
            if (metrics.errorRate > this.defaultThresholds.errorRate) {
                await this.triggerAlert('HIGH_ERROR_RATE', {
                    currentRate: metrics.errorRate,
                    threshold: this.defaultThresholds.errorRate,
                    recentErrors: metrics.recentErrors.slice(0, 5),
                });
            }

            // Check for critical endpoint errors
            if (this.defaultThresholds.criticalEndpoints.includes(event.endpoint)) {
                const endpointErrors = metrics.recentErrors.filter(
                    e => e.endpoint === event.endpoint
                );

                if (endpointErrors.length >= this.defaultThresholds.consecutiveErrors) {
                    await this.triggerAlert('CRITICAL_ENDPOINT_ERRORS', {
                        endpoint: event.endpoint,
                        errorCount: endpointErrors.length,
                        threshold: this.defaultThresholds.consecutiveErrors,
                    });
                }
            }
        } catch (error) {
            this.logger.error('Failed to check alert thresholds', error);
        }
    }

    private async triggerAlert(alertType: string, details: any): Promise<void> {
        // In a real application, this would send alerts to monitoring services
        // like Slack, PagerDuty, email, etc.
        this.logger.warn(`ALERT TRIGGERED: ${alertType}`, details);

        // Store alert in cache to prevent spam
        const alertKey = `${this.errorCachePrefix}:alert:${alertType}`;
        const lastAlert = await this.cacheService.get(alertKey);

        if (!lastAlert.success || !lastAlert.data) {
            // Send alert (implement your alerting logic here)
            await this.sendAlert(alertType, details);

            // Set cooldown period (5 minutes)
            await this.cacheService.set(alertKey, true, { ttl: 5 * 60 });
        }
    }

    private async sendAlert(alertType: string, details: any): Promise<void> {
        // Implement your alerting mechanism here
        // Examples: Slack webhook, email, SMS, PagerDuty, etc.
        this.logger.error(`Alert: ${alertType}`, details);
    }

    private generateErrorId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}