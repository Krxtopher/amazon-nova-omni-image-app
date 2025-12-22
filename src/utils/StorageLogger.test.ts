import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { StorageLogger, storageLogger, type StorageOperationMetrics } from './StorageLogger';
import { StorageDebugger, storageDebugger } from './StorageDebugger';

describe('Storage Logging and Observability Tests', () => {
    beforeEach(() => {
        // Clear logger history before each test
        storageLogger.clearHistory();

        // Reset any mocks
        vi.clearAllMocks();
    });

    describe('Property-Based Tests', () => {
        /**
         * **Feature: data-storage-optimization, Property 9: Debugging and Observability**
         * **Validates: Requirements 5.5**
         */
        it('should provide clear, separate logging for each storage mechanism to enable effective debugging', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        operation: fc.constantFrom(
                            'init', 'addImage', 'updateImage', 'deleteImage', 'getAllImageMetadata',
                            'storeImageData', 'getImageData', 'deleteImageData', 'cleanupOldestImages',
                            'getItem', 'setItem', 'removeItem'
                        ),
                        storageType: fc.constantFrom('localStorage', 'sqlite', 'indexeddb'),
                        success: fc.boolean(),
                        duration: fc.integer({ min: 1, max: 5000 }),
                        dataSize: fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: undefined }),
                        error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
                        metadata: fc.option(fc.record({
                            imageId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
                            recordCount: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
                            cacheHit: fc.option(fc.boolean(), { nil: undefined }),
                        }), { nil: undefined }),
                    }), { minLength: 5, maxLength: 50 }),
                    async (operations) => {
                        // Clear logger history for this test iteration
                        storageLogger.clearHistory();

                        // Log all operations
                        const loggedOperations: StorageOperationMetrics[] = [];
                        for (const op of operations) {
                            const timer = storageLogger.startOperation(op.operation, op.storageType, op.metadata);

                            // Simulate operation duration
                            await new Promise(resolve => setTimeout(resolve, Math.min(op.duration, 10))); // Cap at 10ms for test speed

                            if (op.success) {
                                timer.success(op.dataSize, op.metadata);
                            } else {
                                timer.error(op.error || 'Test error', op.dataSize, op.metadata);
                            }

                            loggedOperations.push({
                                operation: op.operation,
                                storageType: op.storageType,
                                duration: expect.any(Number),
                                success: op.success,
                                error: op.success ? undefined : (op.error || 'Test error'),
                                dataSize: op.dataSize,
                                timestamp: expect.any(Number),
                                metadata: op.metadata
                            });
                        }

                        // Verify separate logging for each storage mechanism
                        const performanceStats = storageLogger.getPerformanceStats();

                        // Check that operations are properly categorized by storage type
                        const sqliteOps = storageLogger.getOperationsByStorage('sqlite');
                        const indexedDBOps = storageLogger.getOperationsByStorage('indexeddb');
                        const localStorageOps = storageLogger.getOperationsByStorage('localStorage');

                        const expectedSqliteCount = operations.filter(op => op.storageType === 'sqlite').length;
                        const expectedIndexedDBCount = operations.filter(op => op.storageType === 'indexeddb').length;
                        const expectedLocalStorageCount = operations.filter(op => op.storageType === 'localStorage').length;

                        expect(sqliteOps).toHaveLength(expectedSqliteCount);
                        expect(indexedDBOps).toHaveLength(expectedIndexedDBCount);
                        expect(localStorageOps).toHaveLength(expectedLocalStorageCount);

                        // Verify each storage mechanism has separate, clear logging
                        for (const storageType of ['sqlite', 'indexeddb', 'localStorage'] as const) {
                            const storageOps = storageLogger.getOperationsByStorage(storageType);

                            // All operations for this storage type should be properly categorized
                            for (const op of storageOps) {
                                expect(op.storageType).toBe(storageType);
                                expect(op.operation).toBeDefined();
                                expect(op.duration).toBeGreaterThanOrEqual(0);
                                expect(op.timestamp).toBeGreaterThan(0);
                                expect(typeof op.success).toBe('boolean');

                                // Failed operations should have error messages
                                if (!op.success) {
                                    expect(op.error).toBeDefined();
                                    expect(op.error).toBeTruthy();
                                }
                            }
                        }

                        // Verify performance statistics are accurate
                        expect(performanceStats.totalOperations).toBe(operations.length);
                        expect(performanceStats.successfulOperations).toBe(operations.filter(op => op.success).length);
                        expect(performanceStats.failedOperations).toBe(operations.filter(op => !op.success).length);

                        // Verify operations are categorized by type
                        for (const operation of operations) {
                            expect(performanceStats.operationsByType[operation.operation]).toBeGreaterThan(0);
                            expect(performanceStats.operationsByStorage[operation.storageType]).toBeGreaterThan(0);
                        }

                        // Verify recent operations can be retrieved
                        const recentOps = storageLogger.getRecentOperations(operations.length);
                        expect(recentOps).toHaveLength(operations.length);

                        // Verify failed operations can be retrieved for debugging
                        const failedOps = storageLogger.getFailedOperations();
                        const expectedFailedCount = operations.filter(op => !op.success).length;
                        expect(failedOps).toHaveLength(expectedFailedCount);

                        // All failed operations should have error information
                        for (const failedOp of failedOps) {
                            expect(failedOp.success).toBe(false);
                            expect(failedOp.error).toBeDefined();
                            expect(failedOp.error).toBeTruthy();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should provide comprehensive debugging utilities for troubleshooting storage issues', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        sqliteOperations: fc.array(fc.record({
                            operation: fc.constantFrom('init', 'addImage', 'getAllImageMetadata'),
                            success: fc.boolean(),
                            duration: fc.integer({ min: 10, max: 1000 }),
                        }), { minLength: 1, maxLength: 10 }),
                        indexedDBOperations: fc.array(fc.record({
                            operation: fc.constantFrom('storeImageData', 'getImageData', 'deleteImageData'),
                            success: fc.boolean(),
                            duration: fc.integer({ min: 10, max: 1000 }),
                        }), { minLength: 1, maxLength: 10 }),
                        localStorageOperations: fc.array(fc.record({
                            operation: fc.constantFrom('getItem', 'setItem', 'removeItem'),
                            success: fc.boolean(),
                            duration: fc.integer({ min: 1, max: 100 }),
                        }), { minLength: 1, maxLength: 5 }),
                    }),
                    async (testData) => {
                        // Clear logger history for this test iteration
                        storageLogger.clearHistory();

                        // Log operations for each storage mechanism
                        const allOperations = [
                            ...testData.sqliteOperations.map(op => ({ ...op, storageType: 'sqlite' as const })),
                            ...testData.indexedDBOperations.map(op => ({ ...op, storageType: 'indexeddb' as const })),
                            ...testData.localStorageOperations.map(op => ({ ...op, storageType: 'localStorage' as const })),
                        ];

                        for (const op of allOperations) {
                            const timer = storageLogger.startOperation(op.operation, op.storageType);

                            // Simulate operation duration (capped for test speed)
                            await new Promise(resolve => setTimeout(resolve, Math.min(op.duration, 5)));

                            if (op.success) {
                                timer.success();
                            } else {
                                timer.error(`${op.storageType} ${op.operation} failed`);
                            }
                        }

                        // Test debugging utilities
                        const performanceStats = storageLogger.getPerformanceStats();

                        // Verify comprehensive performance statistics
                        expect(performanceStats.totalOperations).toBe(allOperations.length);
                        expect(performanceStats.successfulOperations).toBe(allOperations.filter(op => op.success).length);
                        expect(performanceStats.failedOperations).toBe(allOperations.filter(op => !op.success).length);
                        expect(performanceStats.averageDuration).toBeGreaterThan(0);

                        // Verify slowest and fastest operations are tracked
                        if (allOperations.length > 0) {
                            expect(performanceStats.slowestOperation).toBeDefined();
                            expect(performanceStats.fastestOperation).toBeDefined();
                            expect(performanceStats.slowestOperation!.duration).toBeGreaterThanOrEqual(performanceStats.fastestOperation!.duration);
                        }

                        // Test export functionality for debugging
                        const exportedData = storageLogger.exportPerformanceData();
                        expect(exportedData).toBeDefined();
                        expect(typeof exportedData).toBe('string');

                        const parsedData = JSON.parse(exportedData);
                        expect(parsedData.timestamp).toBeDefined();
                        expect(parsedData.stats).toEqual(performanceStats);
                        expect(parsedData.recentOperations).toBeDefined();
                        expect(Array.isArray(parsedData.recentOperations)).toBe(true);

                        // Test storage-specific debugging
                        for (const storageType of ['sqlite', 'indexeddb', 'localStorage'] as const) {
                            const storageOps = storageLogger.getOperationsByStorage(storageType);
                            const expectedCount = allOperations.filter(op => op.storageType === storageType).length;
                            expect(storageOps).toHaveLength(expectedCount);

                            // Each storage mechanism should have clear, separate logging
                            for (const op of storageOps) {
                                expect(op.storageType).toBe(storageType);
                                expect(op.operation).toBeDefined();
                                expect(op.duration).toBeGreaterThan(0);
                                expect(typeof op.success).toBe('boolean');
                            }
                        }

                        // Test failed operations debugging
                        const failedOps = storageLogger.getFailedOperations();
                        const expectedFailedCount = allOperations.filter(op => !op.success).length;
                        expect(failedOps).toHaveLength(expectedFailedCount);

                        // Failed operations should provide clear error information for debugging
                        for (const failedOp of failedOps) {
                            expect(failedOp.success).toBe(false);
                            expect(failedOp.error).toBeDefined();
                            expect(failedOp.error).toContain(failedOp.storageType);
                            expect(failedOp.error).toContain(failedOp.operation);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should enable effective debugging through health reports and diagnostics', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        operationCounts: fc.record({
                            sqlite: fc.integer({ min: 0, max: 20 }),
                            indexeddb: fc.integer({ min: 0, max: 20 }),
                            localStorage: fc.integer({ min: 0, max: 10 }),
                        }),
                        failureRates: fc.record({
                            sqlite: fc.float({ min: 0, max: 1 }),
                            indexeddb: fc.float({ min: 0, max: 1 }),
                            localStorage: fc.float({ min: 0, max: 1 }),
                        }),
                        performanceProfile: fc.record({
                            fastOperations: fc.integer({ min: 1, max: 5 }),
                            slowOperations: fc.integer({ min: 0, max: 3 }),
                        }),
                    }),
                    async (testScenario) => {
                        // Clear logger history for this test iteration
                        storageLogger.clearHistory();

                        // Generate operations based on test scenario
                        const operations: Array<{
                            operation: string;
                            storageType: 'sqlite' | 'indexeddb' | 'localStorage';
                            success: boolean;
                            duration: number;
                        }> = [];

                        // Generate SQLite operations
                        for (let i = 0; i < testScenario.operationCounts.sqlite; i++) {
                            operations.push({
                                operation: 'addImage',
                                storageType: 'sqlite',
                                success: Math.random() > testScenario.failureRates.sqlite,
                                duration: Math.random() < 0.8 ?
                                    Math.random() * 100 + 10 : // Fast operations
                                    Math.random() * 1000 + 500 // Slow operations
                            });
                        }

                        // Generate IndexedDB operations
                        for (let i = 0; i < testScenario.operationCounts.indexeddb; i++) {
                            operations.push({
                                operation: 'storeImageData',
                                storageType: 'indexeddb',
                                success: Math.random() > testScenario.failureRates.indexeddb,
                                duration: Math.random() < 0.8 ?
                                    Math.random() * 200 + 20 : // Fast operations
                                    Math.random() * 2000 + 1000 // Slow operations
                            });
                        }

                        // Generate LocalStorage operations
                        for (let i = 0; i < testScenario.operationCounts.localStorage; i++) {
                            operations.push({
                                operation: 'setItem',
                                storageType: 'localStorage',
                                success: Math.random() > testScenario.failureRates.localStorage,
                                duration: Math.random() * 50 + 1 // LocalStorage is typically fast
                            });
                        }

                        // Log all operations
                        for (const op of operations) {
                            const timer = storageLogger.startOperation(op.operation, op.storageType);

                            // Simulate operation duration (capped for test speed)
                            await new Promise(resolve => setTimeout(resolve, Math.min(op.duration, 10)));

                            if (op.success) {
                                timer.success();
                            } else {
                                timer.error(`${op.storageType} operation failed`);
                            }
                        }

                        // Test health report generation
                        const healthReport = await storageDebugger.generateHealthReport();

                        // Verify health report structure and content
                        expect(healthReport.timestamp).toBeDefined();
                        expect(healthReport.sqlite).toBeDefined();
                        expect(healthReport.indexeddb).toBeDefined();
                        expect(healthReport.localStorage).toBeDefined();
                        expect(healthReport.performance).toBeDefined();
                        expect(healthReport.recommendations).toBeDefined();
                        expect(Array.isArray(healthReport.recommendations)).toBe(true);

                        // Verify performance statistics in health report
                        const perfStats = healthReport.performance;
                        expect(perfStats.totalOperations).toBe(operations.length);
                        expect(perfStats.successfulOperations).toBe(operations.filter(op => op.success).length);
                        expect(perfStats.failedOperations).toBe(operations.filter(op => !op.success).length);

                        // Verify storage-specific health information
                        expect(typeof healthReport.sqlite.initialized).toBe('boolean');
                        expect(typeof healthReport.sqlite.recordCount).toBe('number');
                        expect(Array.isArray(healthReport.sqlite.recentErrors)).toBe(true);
                        expect(typeof healthReport.sqlite.averageQueryTime).toBe('number');

                        expect(typeof healthReport.indexeddb.available).toBe('boolean');
                        expect(typeof healthReport.indexeddb.storageUsage.used).toBe('number');
                        expect(typeof healthReport.indexeddb.storageUsage.quota).toBe('number');
                        expect(typeof healthReport.indexeddb.storageUsage.percentage).toBe('number');
                        expect(Array.isArray(healthReport.indexeddb.recentErrors)).toBe(true);

                        expect(typeof healthReport.localStorage.available).toBe('boolean');
                        expect(typeof healthReport.localStorage.usage).toBe('number');
                        expect(Array.isArray(healthReport.localStorage.recentErrors)).toBe(true);

                        // Verify recommendations are provided for debugging
                        expect(healthReport.recommendations.length).toBeGreaterThan(0);
                        for (const recommendation of healthReport.recommendations) {
                            expect(typeof recommendation).toBe('string');
                            expect(recommendation.length).toBeGreaterThan(0);
                        }

                        // Test debug info export
                        const debugInfo = await storageDebugger.exportDebugInfo();
                        expect(debugInfo).toBeDefined();
                        expect(typeof debugInfo).toBe('string');

                        const parsedDebugInfo = JSON.parse(debugInfo);
                        expect(parsedDebugInfo.timestamp).toBeDefined();
                        expect(parsedDebugInfo.healthReport).toBeDefined();
                        expect(parsedDebugInfo.recentOperations).toBeDefined();
                        expect(parsedDebugInfo.failedOperations).toBeDefined();
                        expect(parsedDebugInfo.browserInfo).toBeDefined();

                        // Verify separate logging enables effective debugging
                        // Each storage mechanism should have distinct error patterns
                        const sqliteErrors = healthReport.sqlite.recentErrors;
                        const indexedDBErrors = healthReport.indexeddb.recentErrors;
                        const localStorageErrors = healthReport.localStorage.recentErrors;

                        // Errors should be storage-specific and identifiable
                        for (const error of sqliteErrors) {
                            expect(typeof error).toBe('string');
                        }
                        for (const error of indexedDBErrors) {
                            expect(typeof error).toBe('string');
                        }
                        for (const error of localStorageErrors) {
                            expect(typeof error).toBe('string');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});