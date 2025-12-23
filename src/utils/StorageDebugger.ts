/**
 * Storage Debugging Utilities
 * Provides debugging and troubleshooting tools for storage operations
 * Requirements: 5.5 - Debugging and observability features
 */

import { storageLogger, type StoragePerformanceStats } from './StorageLogger';
import { sqliteService } from '../services/sqliteService';
import { binaryStorageService } from '../services/BinaryStorageService';

export interface StorageHealthReport {
    timestamp: string;
    sqlite: {
        initialized: boolean;
        recordCount: number;
        recentErrors: string[];
        averageQueryTime: number;
    };
    indexeddb: {
        available: boolean;
        storageUsage: { used: number; quota: number; percentage: number };
        recentErrors: string[];
        averageOperationTime: number;
    };
    localStorage: {
        available: boolean;
        usage: number;
        recentErrors: string[];
    };
    performance: StoragePerformanceStats;
    recommendations: string[];
}

/**
 * Storage Debugger Class
 * Provides comprehensive debugging utilities for all storage mechanisms
 */
export class StorageDebugger {
    private static instance: StorageDebugger;

    private constructor() { }

    public static getInstance(): StorageDebugger {
        if (!StorageDebugger.instance) {
            StorageDebugger.instance = new StorageDebugger();
        }
        return StorageDebugger.instance;
    }

    /**
     * Generate comprehensive storage health report
     */
    public async generateHealthReport(): Promise<StorageHealthReport> {
        const performanceStats = storageLogger.getPerformanceStats();

        // SQLite health check
        const sqliteHealth = await this.checkSQLiteHealth();

        // IndexedDB health check
        const indexedDBHealth = await this.checkIndexedDBHealth();

        // LocalStorage health check
        const localStorageHealth = this.checkLocalStorageHealth();

        // Generate recommendations
        const recommendations = this.generateRecommendations(
            sqliteHealth,
            indexedDBHealth,
            localStorageHealth,
            performanceStats
        );

        return {
            timestamp: new Date().toISOString(),
            sqlite: sqliteHealth,
            indexeddb: indexedDBHealth,
            localStorage: localStorageHealth,
            performance: performanceStats,
            recommendations
        };
    }

    /**
     * Check SQLite database health
     */
    private async checkSQLiteHealth() {
        const sqliteOps = storageLogger.getOperationsByStorage('sqlite');
        const recentErrors = sqliteOps
            .filter(op => !op.success)
            .slice(-5)
            .map(op => op.error || 'Unknown error');

        const averageQueryTime = sqliteOps.length > 0
            ? sqliteOps.reduce((sum, op) => sum + op.duration, 0) / sqliteOps.length
            : 0;

        let recordCount = 0;
        let initialized = false;

        try {
            await sqliteService.init();
            initialized = true;
            recordCount = await sqliteService.getCompleteImageMetadataCount();
        } catch (error) {
            // Health check failed
        }

        return {
            initialized,
            recordCount,
            recentErrors,
            averageQueryTime
        };
    }

    /**
     * Check IndexedDB health
     */
    private async checkIndexedDBHealth() {
        const indexedDBOps = storageLogger.getOperationsByStorage('indexeddb');
        const recentErrors = indexedDBOps
            .filter(op => !op.success)
            .slice(-5)
            .map(op => op.error || 'Unknown error');

        const averageOperationTime = indexedDBOps.length > 0
            ? indexedDBOps.reduce((sum, op) => sum + op.duration, 0) / indexedDBOps.length
            : 0;

        let storageUsage = { used: 0, quota: 0, percentage: 0 };
        let available = false;

        try {
            const usage = await binaryStorageService.getStorageUsage();
            storageUsage = {
                ...usage,
                percentage: usage.quota > 0 ? (usage.used / usage.quota) * 100 : 0
            };
            available = true;
        } catch (error) {
            // IndexedDB not available or failed
        }

        return {
            available,
            storageUsage,
            recentErrors,
            averageOperationTime
        };
    }

    /**
     * Check LocalStorage health
     */
    private checkLocalStorageHealth() {
        const localStorageOps = storageLogger.getOperationsByStorage('localStorage');
        const recentErrors = localStorageOps
            .filter(op => !op.success)
            .slice(-5)
            .map(op => op.error || 'Unknown error');

        let available = false;
        let usage = 0;

        try {
            // Test localStorage availability
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            available = true;

            // Estimate localStorage usage
            let totalSize = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            usage = totalSize;
        } catch (error) {
            // LocalStorage not available
        }

        return {
            available,
            usage,
            recentErrors
        };
    }

    /**
     * Generate performance and health recommendations
     */
    private generateRecommendations(
        sqliteHealth: any,
        indexedDBHealth: any,
        localStorageHealth: any,
        performanceStats: StoragePerformanceStats
    ): string[] {
        const recommendations: string[] = [];

        // Performance recommendations
        if (performanceStats.averageDuration > 500) {
            recommendations.push('Average storage operation time is high (>500ms). Consider optimizing queries or reducing data size.');
        }

        if (performanceStats.failedOperations > performanceStats.totalOperations * 0.1) {
            recommendations.push('High failure rate detected (>10%). Check network connectivity and storage availability.');
        }

        // SQLite recommendations
        if (sqliteHealth.averageQueryTime > 200) {
            recommendations.push('SQLite queries are slow (>200ms). Consider adding indexes or reducing query complexity.');
        }

        if (sqliteHealth.recordCount > 10000) {
            recommendations.push('Large number of SQLite records detected. Consider implementing data archiving or cleanup strategies.');
        }

        // IndexedDB recommendations
        if (indexedDBHealth.storageUsage.percentage > 80) {
            recommendations.push('IndexedDB storage usage is high (>80%). Consider implementing cleanup strategies.');
        }

        if (indexedDBHealth.averageOperationTime > 300) {
            recommendations.push('IndexedDB operations are slow (>300ms). Consider reducing binary data size or implementing compression.');
        }

        // LocalStorage recommendations
        if (localStorageHealth.usage > 5 * 1024 * 1024) { // 5MB
            recommendations.push('LocalStorage usage is high (>5MB). Consider moving data to IndexedDB or implementing cleanup.');
        }

        // Error-based recommendations
        if (sqliteHealth.recentErrors.length > 0) {
            recommendations.push('Recent SQLite errors detected. Check database integrity and initialization.');
        }

        if (indexedDBHealth.recentErrors.length > 0) {
            recommendations.push('Recent IndexedDB errors detected. Check browser compatibility and storage permissions.');
        }

        if (localStorageHealth.recentErrors.length > 0) {
            recommendations.push('Recent LocalStorage errors detected. Check storage quota and browser settings.');
        }

        if (recommendations.length === 0) {
            recommendations.push('All storage mechanisms are operating within normal parameters.');
        }

        return recommendations;
    }

    /**
     * Run comprehensive storage diagnostics
     */
    public async runDiagnostics(): Promise<void> {
        console.group('Storage Diagnostics');

        try {
            const healthReport = await this.generateHealthReport();

            console.log('Performance:', healthReport.performance);
            console.log('SQLite:', healthReport.sqlite);
            console.log('IndexedDB:', healthReport.indexeddb);
            console.log('LocalStorage:', healthReport.localStorage);
            console.log('Recommendations:', healthReport.recommendations);

            // Test basic operations
            await this.testBasicOperations();

        } catch (error) {
            console.error('Diagnostics failed:', error);
        } finally {
            console.groupEnd();
        }
    }

    /**
     * Test basic storage operations
     */
    private async testBasicOperations(): Promise<void> {
        console.group('Testing Operations');

        // Test SQLite
        try {
            await sqliteService.init();
            console.log('SQLite: OK');
        } catch (error) {
            console.error('SQLite failed:', error);
        }

        // Test IndexedDB
        try {
            const usage = await binaryStorageService.getStorageUsage();
            console.log('IndexedDB: OK', usage);
        } catch (error) {
            console.error('IndexedDB failed:', error);
        }

        // Test LocalStorage
        try {
            const testKey = '__diagnostic_test__';
            localStorage.setItem(testKey, 'test');
            const value = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);

            if (value === 'test') {
                console.log('LocalStorage: OK');
            } else {
                console.error('LocalStorage: read/write mismatch');
            }
        } catch (error) {
            console.error('LocalStorage failed:', error);
        }

        console.groupEnd();
    }

    /**
     * Clear all storage data (for debugging purposes)
     */
    public async clearAllStorageData(): Promise<void> {
        console.warn('Clearing all storage data...');

        try {
            // Clear SQLite
            await sqliteService.clearAll();
            console.log('SQLite cleared');

            // Clear IndexedDB (by deleting databases)
            const databases = await indexedDB.databases();
            for (const db of databases) {
                if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                }
            }
            console.log('IndexedDB cleared');

            // Clear LocalStorage
            localStorage.clear();
            console.log('LocalStorage cleared');

            // Clear logger history
            storageLogger.clearHistory();
            console.log('Logger history cleared');

        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }

    /**
     * Export debug information for support
     */
    public async exportDebugInfo(): Promise<string> {
        const healthReport = await this.generateHealthReport();
        const recentOperations = storageLogger.getRecentOperations(50);
        const failedOperations = storageLogger.getFailedOperations();

        const debugInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            healthReport,
            recentOperations,
            failedOperations,
            browserInfo: {
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                language: navigator.language,
                platform: navigator.platform
            }
        };

        return JSON.stringify(debugInfo, null, 2);
    }
}

// Export singleton instance
export const storageDebugger = StorageDebugger.getInstance();

// Make debugger available globally for debugging
declare global {
    interface Window {
        storageDebugger: StorageDebugger;
    }
}

if (typeof window !== 'undefined') {
    window.storageDebugger = storageDebugger;
}