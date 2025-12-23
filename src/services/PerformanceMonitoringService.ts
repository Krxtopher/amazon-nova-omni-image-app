/**
 * Performance monitoring service for streaming prompt display
 * 
 * This service provides comprehensive performance monitoring and metrics
 * for the streaming prompt enhancement and display system.
 */

import { PerformanceOptimizer, type PerformanceMetrics } from '../utils/PerformanceOptimizer';

export interface StreamingPerformanceMetrics extends PerformanceMetrics {
    enhancementResponseTimes: number[];
    wordDisplayTimingAccuracy: number;
    concurrentDisplayCount: number;
    memoryLeakDetected: boolean;
    averageEnhancementTime: number;
    averageDisplayTime: number;
}

export interface PerformanceAlert {
    type: 'memory' | 'timing' | 'concurrency' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    metrics: Partial<StreamingPerformanceMetrics>;
}

export interface PerformanceThresholds {
    maxMemoryUsage: number; // bytes
    maxEnhancementTime: number; // ms
    maxDisplayTime: number; // ms
    maxConcurrentDisplays: number;
    maxTimingDeviation: number; // percentage
}

/**
 * Service for monitoring and analyzing streaming display performance
 */
export class PerformanceMonitoringService {
    private static instance: PerformanceMonitoringService | null = null;

    private performanceOptimizer: PerformanceOptimizer;
    private enhancementTimes: number[] = [];
    private displayTimes: number[] = [];
    private alerts: PerformanceAlert[] = [];
    private isMonitoring: boolean = false;
    private monitoringInterval: NodeJS.Timeout | null = null;

    private readonly MAX_METRIC_HISTORY = 1000;
    private readonly MONITORING_INTERVAL = 1000; // 1 second

    private thresholds: PerformanceThresholds = {
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxEnhancementTime: 10000, // 10 seconds
        maxDisplayTime: 30000, // 30 seconds
        maxConcurrentDisplays: 10,
        maxTimingDeviation: 50 // 50%
    };

    private constructor() {
        this.performanceOptimizer = PerformanceOptimizer.getInstance();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): PerformanceMonitoringService {
        if (!PerformanceMonitoringService.instance) {
            PerformanceMonitoringService.instance = new PerformanceMonitoringService();
        }
        return PerformanceMonitoringService.instance;
    }

    /**
     * Start performance monitoring
     */
    startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        this.monitoringInterval = setInterval(() => {
            this.checkPerformanceThresholds();
        }, this.MONITORING_INTERVAL);
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Record enhancement response time
     */
    recordEnhancementTime(startTime: number, endTime: number): void {
        const duration = endTime - startTime;
        this.enhancementTimes.push(duration);

        if (this.enhancementTimes.length > this.MAX_METRIC_HISTORY) {
            this.enhancementTimes.shift();
        }

        // Check for performance issues
        if (duration > this.thresholds.maxEnhancementTime) {
            this.createAlert('timing', 'high',
                `Enhancement took ${duration}ms, exceeding threshold of ${this.thresholds.maxEnhancementTime}ms`,
                { averageEnhancementTime: duration }
            );
        }
    }

    /**
     * Record word display timing
     */
    recordDisplayTime(startTime: number, endTime: number): void {
        const duration = endTime - startTime;
        this.displayTimes.push(duration);

        if (this.displayTimes.length > this.MAX_METRIC_HISTORY) {
            this.displayTimes.shift();
        }

        // Check for performance issues
        if (duration > this.thresholds.maxDisplayTime) {
            this.createAlert('timing', 'medium',
                `Display took ${duration}ms, exceeding threshold of ${this.thresholds.maxDisplayTime}ms`,
                { averageDisplayTime: duration }
            );
        }
    }

    /**
     * Get comprehensive performance metrics
     */
    getMetrics(): StreamingPerformanceMetrics {
        const baseMetrics = this.performanceOptimizer.getMetrics();

        return {
            ...baseMetrics,
            enhancementResponseTimes: [...this.enhancementTimes],
            wordDisplayTimingAccuracy: this.calculateTimingAccuracy(),
            concurrentDisplayCount: baseMetrics.activeDisplays,
            memoryLeakDetected: this.detectMemoryLeak(),
            averageEnhancementTime: this.calculateAverage(this.enhancementTimes),
            averageDisplayTime: this.calculateAverage(this.displayTimes)
        };
    }

    /**
     * Get performance alerts
     */
    getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
        if (severity) {
            return this.alerts.filter(alert => alert.severity === severity);
        }
        return [...this.alerts];
    }

    /**
     * Clear performance alerts
     */
    clearAlerts(): void {
        this.alerts = [];
    }

    /**
     * Update performance thresholds
     */
    updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    /**
     * Get performance debugging information
     */
    getDebugInfo(): Record<string, any> {
        const metrics = this.getMetrics();

        return {
            isMonitoring: this.isMonitoring,
            thresholds: this.thresholds,
            metrics,
            alerts: this.alerts,
            memoryTrend: this.getMemoryTrend(),
            timingTrend: this.getTimingTrend(),
            recommendations: this.getPerformanceRecommendations()
        };
    }

    /**
     * Check performance thresholds and create alerts
     */
    private checkPerformanceThresholds(): void {
        const metrics = this.performanceOptimizer.getMetrics();

        // Check memory usage
        if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
            this.createAlert('memory', 'high',
                `Memory usage ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB exceeds threshold`,
                { memoryUsage: metrics.memoryUsage }
            );
        }

        // Check concurrent displays
        if (metrics.activeDisplays > this.thresholds.maxConcurrentDisplays) {
            this.createAlert('concurrency', 'medium',
                `${metrics.activeDisplays} concurrent displays exceed threshold of ${this.thresholds.maxConcurrentDisplays}`,
                { concurrentDisplayCount: metrics.activeDisplays }
            );
        }

        // Check for memory leaks
        if (this.detectMemoryLeak()) {
            this.createAlert('memory', 'critical',
                'Potential memory leak detected - memory usage trending upward',
                { memoryLeakDetected: true }
            );
        }
    }

    /**
     * Create a performance alert
     */
    private createAlert(
        type: PerformanceAlert['type'],
        severity: PerformanceAlert['severity'],
        message: string,
        metrics: Partial<StreamingPerformanceMetrics>
    ): void {
        const alert: PerformanceAlert = {
            type,
            severity,
            message,
            timestamp: Date.now(),
            metrics
        };

        this.alerts.push(alert);

        // Keep only recent alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }

        // Log critical alerts
        if (severity === 'critical') {
            console.error('Critical performance alert:', alert);
        } else if (severity === 'high') {
            console.warn('High performance alert:', alert);
        }
    }

    /**
     * Calculate timing accuracy
     */
    private calculateTimingAccuracy(): number {
        if (this.displayTimes.length === 0) return 100;

        const average = this.calculateAverage(this.displayTimes);
        const deviations = this.displayTimes.map(time => Math.abs(time - average) / average * 100);
        const averageDeviation = this.calculateAverage(deviations);

        return Math.max(0, 100 - averageDeviation);
    }

    /**
     * Detect potential memory leaks
     */
    private detectMemoryLeak(): boolean {
        // Simple heuristic: if memory usage has been trending upward consistently
        const metrics = this.performanceOptimizer.getMetrics();

        // This is a simplified check - in a real implementation, you'd track memory over time
        return metrics.memoryUsage > this.thresholds.maxMemoryUsage * 1.5;
    }

    /**
     * Calculate average of an array of numbers
     */
    private calculateAverage(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    /**
     * Get memory usage trend
     */
    private getMemoryTrend(): string {
        // Simplified trend analysis
        const currentMemory = this.performanceOptimizer.getMetrics().memoryUsage;

        if (currentMemory > this.thresholds.maxMemoryUsage) {
            return 'increasing';
        } else if (currentMemory < this.thresholds.maxMemoryUsage * 0.5) {
            return 'stable';
        } else {
            return 'moderate';
        }
    }

    /**
     * Get timing trend analysis
     */
    private getTimingTrend(): string {
        if (this.displayTimes.length < 10) return 'insufficient_data';

        const recent = this.displayTimes.slice(-10);
        const older = this.displayTimes.slice(-20, -10);

        if (older.length === 0) return 'insufficient_data';

        const recentAvg = this.calculateAverage(recent);
        const olderAvg = this.calculateAverage(older);

        const change = (recentAvg - olderAvg) / olderAvg * 100;

        if (change > 20) return 'degrading';
        if (change < -20) return 'improving';
        return 'stable';
    }

    /**
     * Get performance recommendations
     */
    private getPerformanceRecommendations(): string[] {
        const recommendations: string[] = [];
        const metrics = this.getMetrics();

        if (metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
            recommendations.push('Consider reducing concurrent displays or implementing display pooling');
        }

        if (metrics.averageEnhancementTime > this.thresholds.maxEnhancementTime * 0.8) {
            recommendations.push('Enhancement times are high - consider optimizing API calls or adding caching');
        }

        if (metrics.activeTimers > 50) {
            recommendations.push('High number of active timers - ensure proper cleanup');
        }

        if (this.calculateTimingAccuracy() < 80) {
            recommendations.push('Word display timing accuracy is low - check for performance bottlenecks');
        }

        return recommendations;
    }

    /**
     * Clean up monitoring resources
     */
    cleanup(): void {
        this.stopMonitoring();
        this.alerts = [];
        this.enhancementTimes = [];
        this.displayTimes = [];
    }
}

/**
 * Hook for using performance monitoring in React components
 */
export function usePerformanceMonitoring() {
    return PerformanceMonitoringService.getInstance();
}