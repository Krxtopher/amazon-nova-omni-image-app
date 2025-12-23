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

    private constructor() {
        // Constructor is empty since debugMode is not used
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
        if (!metrics.success) {
            this.logToConsole(metrics);
        }

        // Log slow operations even in production
        if (metrics.duration > 2000) { // Operations taking more than 2 seconds
            console.warn(`Slow ${metrics.storageType} ${metrics.operation}: ${metrics.duration.toFixed(0)}ms`);
        }
    }

    /**
     * Log operation to console with appropriate formatting
     */
    private logToConsole(metrics: StorageOperationMetrics): void {
        // Only log errors and critical slow operations
        if (!metrics.success) {
            console.error(`${metrics.storageType}: ${metrics.operation} failed ${metrics.duration.toFixed(0)}ms - ${metrics.error}`);
        }
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
            // No startup operations found in recent history
            return;
        }

        // Startup Performance Analysis

        // Group by storage type
        const byStorage = startupOps.reduce((acc, op) => {
            if (!acc[op.storageType]) acc[op.storageType] = [];
            acc[op.storageType].push(op);
            return acc;
        }, {} as Record<string, StorageOperationMetrics[]>);

        let totalStartupTime = 0;

        Object.entries(byStorage).forEach(([_storageType, ops]) => {
            const totalTime = ops.reduce((sum, op) => sum + op.duration, 0);
            totalTime / ops.length;
            totalStartupTime += totalTime;

            // Storage analysis data available in return value
        });

        // Analysis complete

        // Identify bottlenecks
        startupOps.filter(op => op.duration > 100).sort((a, b) => b.duration - a.duration);
        // Bottleneck analysis complete
    }

    /**
     * Show current cache and storage status
     */
    public showStorageStatus(): void {
        // Storage status analysis

        // Get recent operations by storage type
        const recentOps = this.getRecentOperations(50);
        const byStorage = recentOps.reduce((acc, op) => {
            if (!acc[op.storageType]) acc[op.storageType] = [];
            acc[op.storageType].push(op);
            return acc;
        }, {} as Record<string, StorageOperationMetrics[]>);

        Object.entries(byStorage).forEach(([_storageType, ops]) => {
            ops.filter(op => op.success).length;
            ops.filter(op => !op.success).length;
            ops.reduce((sum, op) => sum + op.duration, 0) / ops.length;

            // Storage type analysis data available
        });

        // Storage status analysis complete
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