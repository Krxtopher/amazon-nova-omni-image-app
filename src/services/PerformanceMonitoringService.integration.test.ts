import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitoringService } from './PerformanceMonitoringService';
import { PerformanceOptimizer } from '../utils/PerformanceOptimizer';
import { WordByWordDisplayEngine } from '../utils/WordByWordDisplayEngine';
import { TokenAccumulator } from '../utils/TokenAccumulator';
import { DEFAULT_WORD_DISPLAY_CONFIG } from '../services/StreamingDisplayConfigService';

// Mock performance APIs
Object.defineProperty(global, 'performance', {
    value: {
        now: vi.fn(() => Date.now())
    },
    writable: true
});

Object.defineProperty(global, 'requestAnimationFrame', {
    value: vi.fn((callback) => {
        setTimeout(callback, 16);
        return 1;
    }),
    writable: true
});

Object.defineProperty(global, 'cancelAnimationFrame', {
    value: vi.fn(),
    writable: true
});

describe('Performance Monitoring Integration Tests', () => {
    let performanceMonitoring: PerformanceMonitoringService;
    let performanceOptimizer: PerformanceOptimizer;
    let displayEngine: WordByWordDisplayEngine;
    let tokenAccumulator: TokenAccumulator;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset singletons
        (PerformanceMonitoringService as any).instance = null;
        (PerformanceOptimizer as any).instance = null;

        performanceMonitoring = PerformanceMonitoringService.getInstance();
        performanceOptimizer = PerformanceOptimizer.getInstance();
        displayEngine = new WordByWordDisplayEngine();
        tokenAccumulator = new TokenAccumulator('integration-test');
    });

    afterEach(() => {
        performanceMonitoring.cleanup();
        performanceOptimizer.cleanup();
        displayEngine.cleanup();
        tokenAccumulator.reset();
    });

    describe('End-to-End Performance Tracking', () => {
        it('should track complete streaming display lifecycle', async () => {
            let mockTime = 1000;
            vi.mocked(performance.now).mockImplementation(() => mockTime);

            performanceMonitoring.startMonitoring();

            // Simulate enhancement phase
            const enhancementStart = mockTime;
            mockTime += 2000; // 2 second enhancement
            performanceMonitoring.recordEnhancementTime(enhancementStart, mockTime);

            // Simulate display phase
            const displayStart = mockTime;
            const testText = 'Hello world test';

            await new Promise<void>((resolve) => {
                displayEngine.startDisplay(
                    testText,
                    DEFAULT_WORD_DISPLAY_CONFIG,
                    (_word, _index) => {
                        // Word revealed - tracking for test
                    },
                    () => {
                        // Display complete
                        mockTime += 3000; // 3 second display
                        performanceMonitoring.recordDisplayTime(displayStart, mockTime);

                        // Verify metrics
                        const metrics = performanceMonitoring.getMetrics();
                        expect(metrics.averageEnhancementTime).toBe(2000);
                        expect(metrics.averageDisplayTime).toBe(3000);

                        resolve();
                    }
                );
            });
        });

        it('should detect performance issues and create alerts', () => {
            performanceMonitoring.startMonitoring();

            // Simulate slow enhancement (exceeds 10s threshold)
            performanceMonitoring.recordEnhancementTime(0, 15000);

            // Simulate slow display (exceeds 30s threshold)
            performanceMonitoring.recordDisplayTime(0, 35000);

            const alerts = performanceMonitoring.getAlerts();
            expect(alerts.length).toBeGreaterThanOrEqual(2);

            const enhancementAlert = alerts.find(alert =>
                alert.type === 'timing' && alert.message.includes('Enhancement')
            );
            const displayAlert = alerts.find(alert =>
                alert.type === 'timing' && alert.message.includes('Display')
            );

            expect(enhancementAlert).toBeDefined();
            expect(displayAlert).toBeDefined();
            expect(enhancementAlert?.severity).toBe('high');
            expect(displayAlert?.severity).toBe('medium');
        });

        it('should track concurrent display performance', () => {
            performanceMonitoring.startMonitoring();

            // Register multiple displays
            const displayIds = ['display-1', 'display-2', 'display-3', 'display-4'];
            displayIds.forEach(id => performanceOptimizer.registerDisplay(id));

            // Create multiple display engines
            const engines = displayIds.map(() => new WordByWordDisplayEngine());

            try {
                const metrics = performanceOptimizer.getMetrics();
                expect(metrics.activeDisplays).toBe(4);

                // Simulate concurrent operations
                engines.forEach((_engine, index) => {
                    performanceOptimizer.createPooledTimer(() => {
                        // Timer executed for test
                    }, 100 * (index + 1));
                });

                expect(performanceOptimizer.getMetrics().activeTimers).toBe(4);

            } finally {
                // Cleanup
                engines.forEach(engine => engine.cleanup());
                displayIds.forEach(id => performanceOptimizer.unregisterDisplay(id));
            }
        });

        it('should provide accurate performance recommendations', () => {
            performanceMonitoring.startMonitoring();

            // Create conditions for recommendations

            // High memory usage scenario
            performanceMonitoring.updateThresholds({ maxMemoryUsage: 10 * 1024 * 1024 }); // 10MB

            // High enhancement times
            for (let i = 0; i < 5; i++) {
                performanceMonitoring.recordEnhancementTime(0, 9500); // Just under threshold
            }

            // Create many timers
            const timerIds: string[] = [];
            for (let i = 0; i < 60; i++) {
                const timerId = performanceOptimizer.createPooledTimer(() => { }, 1000);
                timerIds.push(timerId);
            }

            try {
                const debugInfo = performanceMonitoring.getDebugInfo();
                expect(debugInfo.recommendations.length).toBeGreaterThan(0);

                const timerRecommendation = debugInfo.recommendations.find((rec: any) =>
                    rec.includes('active timers')
                );
                expect(timerRecommendation).toBeDefined();

            } finally {
                // Cleanup timers
                timerIds.forEach(id => performanceOptimizer.removePooledTimer(id));
            }
        });

        it('should handle memory pressure scenarios', () => {
            // Mock high memory usage
            Object.defineProperty(performance, 'memory', {
                value: {
                    usedJSHeapSize: 180 * 1024 * 1024 // 180MB (exceeds 150MB threshold)
                },
                configurable: true
            });

            performanceMonitoring.startMonitoring();

            // Wait for monitoring cycle to detect memory pressure
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    const alerts = performanceMonitoring.getAlerts();
                    const memoryAlert = alerts.find(alert => alert.type === 'memory');

                    expect(memoryAlert).toBeDefined();
                    expect(memoryAlert?.severity).toBe('high');

                    const metrics = performanceMonitoring.getMetrics();
                    expect(metrics.memoryLeakDetected).toBe(true);

                    resolve();
                }, 1100);
            });
        });

        it('should coordinate with token accumulator performance', () => {
            let mockTime = 1000;
            vi.mocked(performance.now).mockImplementation(() => mockTime);

            performanceMonitoring.startMonitoring();

            // Simulate rapid token processing
            const tokens = ['Hello', ' ', 'world', ' ', 'this', ' ', 'is', ' ', 'a', ' ', 'test'];

            tokens.forEach((token, _index) => {
                mockTime += 5; // 5ms per token
                tokenAccumulator.addToken(token);

                // Track new words for test verification
            });

            // Verify token processing was tracked
            const optimizerMetrics = performanceOptimizer.getMetrics();
            expect(optimizerMetrics.averageTokenProcessingTime).toBeGreaterThan(0);
        });

        it('should handle display engine performance integration', async () => {
            let mockTime = 1000;
            vi.mocked(performance.now).mockImplementation(() => mockTime);

            performanceMonitoring.startMonitoring();

            const displayStart = mockTime;
            const testText = 'Performance test text with multiple words';

            await new Promise<void>((resolve) => {
                displayEngine.startDisplay(
                    testText,
                    {
                        baseDelay: { min: 50, max: 50 },
                        longWordDelayMultiplier: 1.5,
                        fadeInDuration: { min: 200, max: 200 },
                        longWordThreshold: 8,
                        punctuationDelays: {}
                    },
                    (_word, _index) => {
                        mockTime += 60; // Simulate word display time
                        // Word display tracked for test
                    },
                    () => {
                        // Display complete
                        const displayEnd = mockTime;
                        performanceMonitoring.recordDisplayTime(displayStart, displayEnd);

                        const metrics = performanceMonitoring.getMetrics();
                        expect(metrics.averageDisplayTime).toBeGreaterThan(0);

                        // Check for timing accuracy
                        expect(metrics.wordDisplayTimingAccuracy).toBeGreaterThan(0);

                        resolve();
                    }
                );
            });
        });
    });

    describe('Performance Optimization Integration', () => {
        it('should optimize concurrent display performance', () => {
            const displayCount = 5;
            const engines: WordByWordDisplayEngine[] = [];

            try {
                // Create multiple display engines
                for (let i = 0; i < displayCount; i++) {
                    const engine = new WordByWordDisplayEngine();
                    engines.push(engine);
                    performanceOptimizer.registerDisplay(`display-${i}`);
                }

                expect(performanceOptimizer.getMetrics().activeDisplays).toBe(displayCount);

                // Start concurrent displays
                engines.forEach((engine, index) => {
                    engine.startDisplay(
                        `Test text for display ${index}`,
                        {
                            baseDelay: { min: 100, max: 100 },
                            longWordDelayMultiplier: 1.5,
                            fadeInDuration: { min: 300, max: 300 },
                            longWordThreshold: 8,
                            punctuationDelays: {}
                        },
                        () => { }, // onWordReveal
                        () => { }  // onComplete
                    );
                });

                // Verify performance optimization is active
                const metrics = performanceOptimizer.getMetrics();
                expect(metrics.activeTimers).toBeGreaterThan(0);

            } finally {
                // Cleanup
                engines.forEach((engine, index) => {
                    engine.cleanup();
                    performanceOptimizer.unregisterDisplay(`display-${index}`);
                });
            }
        });

        it('should handle animation frame coordination', async () => {
            let animationCallbacks = 0;

            await new Promise<void>((resolve) => {
                // Schedule multiple animation frames
                for (let i = 0; i < 5; i++) {
                    performanceOptimizer.scheduleAnimationFrame(() => {
                        animationCallbacks++;

                        if (animationCallbacks === 5) {
                            // All callbacks executed
                            expect(animationCallbacks).toBe(5);

                            // Should have batched into single requestAnimationFrame call
                            expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
                            resolve();
                        }
                    });
                }
            });
        });

        it('should provide comprehensive performance insights', () => {
            performanceMonitoring.startMonitoring();

            // Create various performance scenarios
            performanceMonitoring.recordEnhancementTime(0, 5000);
            performanceMonitoring.recordDisplayTime(0, 8000);

            // Create some load
            for (let i = 0; i < 10; i++) {
                performanceOptimizer.createPooledTimer(() => { }, 1000);
                performanceOptimizer.registerDisplay(`load-test-${i}`);
            }

            try {
                const debugInfo = performanceMonitoring.getDebugInfo();

                // Should provide comprehensive insights
                expect(debugInfo.metrics.averageEnhancementTime).toBe(5000);
                expect(debugInfo.metrics.averageDisplayTime).toBe(8000);
                expect(debugInfo.metrics.concurrentDisplayCount).toBe(10);

                // Should have performance recommendations
                expect(debugInfo.recommendations.length).toBeGreaterThan(0);

                // Should track trends
                expect(['increasing', 'stable', 'moderate']).toContain(debugInfo.memoryTrend);
                expect(['degrading', 'improving', 'stable', 'insufficient_data']).toContain(debugInfo.timingTrend);

            } finally {
                // Cleanup
                performanceOptimizer.clearAllPooledTimers();
                for (let i = 0; i < 10; i++) {
                    performanceOptimizer.unregisterDisplay(`load-test-${i}`);
                }
            }
        });
    });

    describe('Error Scenarios and Recovery', () => {
        it('should handle performance monitoring failures gracefully', () => {
            // Mock performance.now to throw error
            vi.mocked(performance.now).mockImplementation(() => {
                throw new Error('Performance API unavailable');
            });

            // Should not crash when performance API fails
            expect(() => {
                performanceMonitoring.recordEnhancementTime(0, 1000);
                performanceMonitoring.recordDisplayTime(0, 2000);
            }).not.toThrow();

            // Should still provide basic metrics
            const metrics = performanceMonitoring.getMetrics();
            expect(metrics).toBeDefined();
            expect(typeof metrics.concurrentDisplayCount).toBe('number');
        });

        it('should recover from optimizer failures', () => {
            // Simulate optimizer failure
            const originalGetMetrics = performanceOptimizer.getMetrics;
            performanceOptimizer.getMetrics = vi.fn(() => {
                throw new Error('Optimizer failure');
            });

            try {
                // Should handle optimizer failures gracefully
                expect(() => {
                    const metrics = performanceMonitoring.getMetrics();
                    expect(metrics).toBeDefined();
                }).not.toThrow();

            } finally {
                // Restore original method
                performanceOptimizer.getMetrics = originalGetMetrics;
            }
        });

        it('should maintain monitoring during component lifecycle', () => {
            performanceMonitoring.startMonitoring();
            expect(performanceMonitoring.getDebugInfo().isMonitoring).toBe(true);

            // Simulate component unmount/remount cycles
            performanceMonitoring.stopMonitoring();
            expect(performanceMonitoring.getDebugInfo().isMonitoring).toBe(false);

            performanceMonitoring.startMonitoring();
            expect(performanceMonitoring.getDebugInfo().isMonitoring).toBe(true);

            // Should maintain state consistency
            const metrics = performanceMonitoring.getMetrics();
            expect(metrics).toBeDefined();
        });
    });
});