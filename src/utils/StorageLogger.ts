/**
 * Storage Performance Logger
 * Provides comprehensive logging and performance monitoring for all storage operations
 * Requirements: 5.5 - Debugging and observability features
 */

export interface StorageOperationMetrics {
    operation: string;
    storageType: 'localStorage' | 'sqlite' | 'indexeddb';
    duration: number;
    success: boolean;
    error?: string;
    dataSize?: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface StoragePerformanceStats {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    slowestOperation: StorageOperationMetrics | null;
    fastestOperation: StorageOperationMetrics | null;
    operationsByType: Record<string, number>;
    operationsByStorage: Record<string, number>;
}

/**
 * Storage Logger Class
 * Provides separate logging for each storage mechanism with performance timing
 */
export class StorageLogger {
    private static instance: StorageLogger;
    private operations: StorageOperationMetrics[] = [];
    private readonly maxOperations = 1000; // Keep last 1000 operations
    private readonly debugMode: boolean;

    private constructor() {
        // Enable debug mode in development or when explicitly enabled
        this.debugMode = import.meta.env.DEV || localStorage.getItem('storage-debug') === 'true';
    }

    public static getInstance(): StorageLogger {
        if (!StorageLogger.instance) {
            StorageLogger.instance = new StorageLogger();
        }
        return StorageLogger.instance;
    }

    /**
     * Start timing a storage operation
     */
    public startOperation(operation: string, storageType: 'localStorage' | 'sqlite' | 'indexeddb', metadata?: Record<string, any>): StorageOperationTimer {
        return new StorageOperationTimer(this, operation, storageType, metadata);
    }

    /**
     * Log a completed storage operation
     */
    public logOperation(metrics: StorageOperationMetrics): void {
        // Add to operations history
        this.operations.push(metrics);

        // Maintain max operations limit
        if (this.operations.length > this.maxOperations) {
            this.operations = this.operations.slice(-this.maxOperations);
        }

        // Console logging based on debug mode and operation result
        if (this.debugMode || !metrics.success) {
            this.logToConsole(metrics);
        }

        // Log slow operations even in production
        if (metrics.duration > 1000) { // Operations taking more than 1 second
            console.warn(`Slow ${metrics.storageType} ${metrics.operation}: ${metrics.duration.toFixed(0)}ms`);
        }
    }

    /**
     * Log operation to console with appropriate formatting
     */
    private logToConsole(metrics: StorageOperationMetrics): void {
        const duration = `${metrics.duration.toFixed(0)}ms`;
        const size = metrics.dataSize ? ` ${this.formatBytes(metrics.dataSize)}` : '';

        if (metrics.success) {
            console.debug(`${metrics.storageType}: ${metrics.operation} ${duration}${size}`);
        } else {
            console.error(`${metrics.storageType}: ${metrics.operation} failed ${duration} - ${metrics.error}`);
        }
    }

    /**
     * Format bytes for human-readable display
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    /**
     * Get performance statistics for all storage operations
     */
    public getPerformanceStats(): StoragePerformanceStats {
        if (this.operations.length === 0) {
            return {
                totalOperations: 0,
                successfulOperations: 0,
                failedOperations: 0,
                averageDuration: 0,
                slowestOperation: null,
                fastestOperation: null,
                operationsByType: {},
                operationsByStorage: {}
            };
        }

        const successful = this.operations.filter(op => op.success);
        const failed = this.operations.filter(op => !op.success);

        const durations = this.operations.map(op => op.duration);
        const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;

        const slowestOperation = this.operations.reduce((slowest, current) =>
            !slowest || current.duration > slowest.duration ? current : slowest
        );

        const fastestOperation = this.operations.reduce((fastest, current) =>
            !fastest || current.duration < fastest.duration ? current : fastest
        );

        // Count operations by type
        const operationsByType: Record<string, number> = {};
        const operationsByStorage: Record<string, number> = {};

        for (const op of this.operations) {
            operationsByType[op.operation] = (operationsByType[op.operation] || 0) + 1;
            operationsByStorage[op.storageType] = (operationsByStorage[op.storageType] || 0) + 1;
        }

        return {
            totalOperations: this.operations.length,
            successfulOperations: successful.length,
            failedOperations: failed.length,
            averageDuration,
            slowestOperation,
            fastestOperation,
            operationsByType,
            operationsByStorage
        };
    }

    /**
     * Get recent operations for debugging
     */
    public getRecentOperations(count: number = 50): StorageOperationMetrics[] {
        return this.operations.slice(-count);
    }

    /**
     * Get operations filtered by storage type
     */
    public getOperationsByStorage(storageType: 'localStorage' | 'sqlite' | 'indexeddb'): StorageOperationMetrics[] {
        return this.operations.filter(op => op.storageType === storageType);
    }

    /**
     * Get failed operations for troubleshooting
     */
    public getFailedOperations(): StorageOperationMetrics[] {
        return this.operations.filter(op => !op.success);
    }

    /**
     * Clear operation history
     */
    public clearHistory(): void {
        this.operations = [];
    }

    /**
     * Enable or disable debug mode
     */
    public setDebugMode(enabled: boolean): void {
        if (enabled) {
            localStorage.setItem('storage-debug', 'true');
        } else {
            localStorage.removeItem('storage-debug');
        }
    }

    /**
     * Export performance data for analysis
     */
    public exportPerformanceData(): string {
        const stats = this.getPerformanceStats();
        const recentOps = this.getRecentOperations(100);

        return JSON.stringify({
            timestamp: new Date().toISOString(),
            stats,
            recentOperations: recentOps
        }, null, 2);
    }

    /**
     * Analyze startup performance and provide insights
     */
    public analyzeStartupPerformance(): void {
        const operations = this.getRecentOperations(100);
        const startupOps = operations.filter(op =>
            op.operation.includes('init') ||
            op.operation.includes('initialize') ||
            op.operation.includes('loadInitialMetadata') ||
            op.operation.includes('getTotalCount')
        );

        if (startupOps.length === 0) {
            console.log('📊 [ANALYSIS] No startup operations found in recent history');
            return;
        }

        console.log('🔍 [ANALYSIS] Startup Performance Analysis:');
        console.log('='.repeat(50));

        // Group by storage type
        const byStorage = startupOps.reduce((acc, op) => {
            if (!acc[op.storageType]) acc[op.storageType] = [];
            acc[op.storageType].push(op);
            return acc;
        }, {} as Record<string, StorageOperationMetrics[]>);

        let totalStartupTime = 0;

        Object.entries(byStorage).forEach(([storageType, ops]) => {
            const totalTime = ops.reduce((sum, op) => sum + op.duration, 0);
            const avgTime = totalTime / ops.length;
            totalStartupTime += totalTime;

            console.log(`\n📦 ${storageType.toUpperCase()}:`);
            console.log(`  Operations: ${ops.length}`);
            console.log(`  Total Time: ${totalTime.toFixed(0)}ms`);
            console.log(`  Average Time: ${avgTime.toFixed(0)}ms`);

            // Show individual operations
            ops.forEach(op => {
                const status = op.success ? '✅' : '❌';
                const metadata = op.metadata ? ` (${JSON.stringify(op.metadata)})` : '';
                console.log(`    ${status} ${op.operation}: ${op.duration.toFixed(0)}ms${metadata}`);
            });
        });

        console.log(`\n🎯 TOTAL STARTUP TIME: ${totalStartupTime.toFixed(0)}ms`);

        // Identify bottlenecks
        const slowOps = startupOps.filter(op => op.duration > 100).sort((a, b) => b.duration - a.duration);
        if (slowOps.length > 0) {
            console.log('\n🐌 POTENTIAL BOTTLENECKS (>100ms):');
            slowOps.forEach(op => {
                console.log(`  ${op.storageType}: ${op.operation} - ${op.duration.toFixed(0)}ms`);
            });
        }

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (byStorage.sqlite && byStorage.sqlite.some(op => op.duration > 200)) {
            console.log('  - SQLite operations are slow. Consider database optimization or reducing initial data load.');
        }
        if (byStorage.indexeddb && byStorage.indexeddb.some(op => op.duration > 100)) {
            console.log('  - IndexedDB operations are slow. This might indicate large binary data being loaded.');
        }
        if (totalStartupTime > 1000) {
            console.log('  - Total startup time >1s. Consider lazy loading or progressive enhancement.');
        }

        console.log('='.repeat(50));
    }

    /**
     * Show current cache and storage status
     */
    public showStorageStatus(): void {
        console.log('💾 [STORAGE STATUS] Current Storage Information:');
        console.log('='.repeat(50));

        // Get recent operations by storage type
        const recentOps = this.getRecentOperations(50);
        const byStorage = recentOps.reduce((acc, op) => {
            if (!acc[op.storageType]) acc[op.storageType] = [];
            acc[op.storageType].push(op);
            return acc;
        }, {} as Record<string, StorageOperationMetrics[]>);

        Object.entries(byStorage).forEach(([storageType, ops]) => {
            const successful = ops.filter(op => op.success).length;
            const failed = ops.filter(op => !op.success).length;
            const avgDuration = ops.reduce((sum, op) => sum + op.duration, 0) / ops.length;

            console.log(`\n📦 ${storageType.toUpperCase()}:`);
            console.log(`  Recent Operations: ${ops.length}`);
            console.log(`  Success Rate: ${successful}/${ops.length} (${((successful / ops.length) * 100).toFixed(1)}%)`);
            console.log(`  Average Duration: ${avgDuration.toFixed(0)}ms`);

            if (failed > 0) {
                console.log(`  ❌ Failed Operations: ${failed}`);
                const failedOps = ops.filter(op => !op.success);
                failedOps.forEach(op => {
                    console.log(`    - ${op.operation}: ${op.error}`);
                });
            }
        });

        console.log('='.repeat(50));
    }
}

/**
 * Storage Operation Timer
 * Helper class for timing storage operations
 */
export class StorageOperationTimer {
    private startTime: number;
    private operation: string;
    private storageType: 'localStorage' | 'sqlite' | 'indexeddb';
    private metadata?: Record<string, any>;
    private logger: StorageLogger;

    constructor(
        logger: StorageLogger,
        operation: string,
        storageType: 'localStorage' | 'sqlite' | 'indexeddb',
        metadata?: Record<string, any>
    ) {
        this.logger = logger;
        this.operation = operation;
        this.storageType = storageType;
        this.metadata = metadata;
        this.startTime = performance.now();
    }

    /**
     * Complete the operation successfully
     */
    public success(dataSize?: number, additionalMetadata?: Record<string, any>): void {
        const duration = performance.now() - this.startTime;

        this.logger.logOperation({
            operation: this.operation,
            storageType: this.storageType,
            duration,
            success: true,
            dataSize,
            timestamp: Date.now(),
            metadata: { ...this.metadata, ...additionalMetadata }
        });
    }

    /**
     * Complete the operation with an error
     */
    public error(error: Error | string, dataSize?: number, additionalMetadata?: Record<string, any>): void {
        const duration = performance.now() - this.startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.logger.logOperation({
            operation: this.operation,
            storageType: this.storageType,
            duration,
            success: false,
            error: errorMessage,
            dataSize,
            timestamp: Date.now(),
            metadata: { ...this.metadata, ...additionalMetadata }
        });
    }
}

// Export singleton instance
export const storageLogger = StorageLogger.getInstance();

// Global debugging utilities
declare global {
    interface Window {
        storageLogger: StorageLogger;
    }
}

// Make logger available globally for debugging
if (typeof window !== 'undefined') {
    window.storageLogger = storageLogger;
}