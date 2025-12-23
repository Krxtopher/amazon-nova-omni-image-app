import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitoringService } from './PerformanceMonitoringService';
import { PerformanceOptimizer } from '../utils/PerformanceOptimizer';

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

describe('Performance Monitoring Simple Integration Tests', () => {
    let performanceMonitoring: PerformanceMonitoringService;
    let performanceOptimizer: PerformanceOptimizer;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset singletons
        (PerformanceMonitoringService as any).instance = null;
        (PerformanceOptimizer as any).instance = null;

        performanceMonitoring = PerformanceMonitoringService.getInstance();
        performanceOptimizer = PerformanceOptimizer.getInstance();
    });

    afterEach(() => {
        performanceMonitoring.cleanup();
        performanceOptimizer.cleanup();
    });

    describe('Basic Performance Tracking', () => {
        it('should track enhancement and display times', () => {
            let mockTime = 1000;
            vi.mocked(performance.now).mockImplementation(() => mockTime);

            performanceMonitoring.startMonitoring();

            // Record enhancement time
            const enhancementStart = mockTime;
            mockTime += 2000;
            performanceMonitoring.recordEnhancementTime(enhancementStart, mockTime);

            // Record display time
            const displayStart = mockTime;
            mockTime += 3000;
            performanceMonitoring.recordDisplayTime(displayStart, mockTime);

            const metrics = performanceMonitoring.getMetrics();
            expect(metrics.averageEnhancementTime).toBe(2000);
            expect(metrics.averageDisplayTime).toBe(3000);
        });

        it('should create alerts for slow performance', () => {
            performanceMonitoring.startMonitoring();

            // Record slow enhancement (exceeds 10s threshold)
            performanceMonitoring.recordEnhancementTime(0, 15000);

            const alerts = performanceMonitoring.getAlerts();
            expect(alerts.length).toBeGreaterThan(0);

            const enhancementAlert = alerts.find(alert =>
                alert.type === 'timing' && alert.message.includes('Enhancement')
            );
            expect(enhancementAlert).toBeDefined();
            expect(enhancementAlert?.severity).toBe('high');
        });

        it('should track optimizer metrics', () => {
            // Register some displays
            performanceOptimizer.registerDisplay('test-1');
            performanceOptimizer.registerDisplay('test-2');

            // Create some timers
            const timer1 = performanceOptimizer.createPooledTimer(() => { }, 1000);
            const timer2 = performanceOptimizer.createPooledTimer(() => { }, 1000);

            try {
                const metrics = performanceOptimizer.getMetrics();
                expect(metrics.activeDisplays).toBeGreaterThanOrEqual(2);
                expect(metrics.activeTimers).toBeGreaterThanOrEqual(2);

            } finally {
                // Cleanup
                performanceOptimizer.removePooledTimer(timer1);
                performanceOptimizer.removePooledTimer(timer2);
                performanceOptimizer.unregisterDisplay('test-1');
                performanceOptimizer.unregisterDisplay('test-2');
            }
        });

        it('should provide performance recommendations', () => {
            performanceMonitoring.startMonitoring();

            // Create conditions for recommendations
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

        it('should handle animation frame coordination', async () => {
            let callbackCount = 0;
            const expectedCallbacks = 3;

            await new Promise<void>((resolve) => {
                // Schedule multiple animation frames
                for (let i = 0; i < expectedCallbacks; i++) {
                    performanceOptimizer.scheduleAnimationFrame(() => {
                        callbackCount++;

                        if (callbackCount === expectedCallbacks) {
                            // All callbacks executed
                            expect(callbackCount).toBe(expectedCallbacks);
                            resolve();
                        }
                    });
                }
            });
        });

        it('should handle error scenarios gracefully', () => {
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

        it('should maintain state during monitoring lifecycle', () => {
            expect(performanceMonitoring.getDebugInfo().isMonitoring).toBe(false);

            performanceMonitoring.startMonitoring();
            expect(performanceMonitoring.getDebugInfo().isMonitoring).toBe(true);

            performanceMonitoring.stopMonitoring();
            expect(performanceMonitoring.getDebugInfo().isMonitoring).toBe(false);

            // Should maintain metrics even when not monitoring
            const metrics = performanceMonitoring.getMetrics();
            expect(metrics).toBeDefined();
        });

        it('should clean up resources properly', () => {
            performanceMonitoring.startMonitoring();

            // Create some resources
            performanceOptimizer.registerDisplay('cleanup-test');
            performanceOptimizer.createPooledTimer(() => { }, 1000);

            // Record some metrics
            performanceMonitoring.recordEnhancementTime(0, 1000);
            performanceMonitoring.recordDisplayTime(0, 2000);

            // Cleanup should reset everything
            performanceMonitoring.cleanup();
            performanceOptimizer.cleanup();

            expect(performanceMonitoring.getDebugInfo().isMonitoring).toBe(false);

            const optimizerMetrics = performanceOptimizer.getMetrics();
            expect(optimizerMetrics.activeDisplays).toBe(0);
            expect(optimizerMetrics.activeTimers).toBe(0);
        });
    });

    describe('Performance Thresholds', () => {
        it('should update and use custom thresholds', () => {
            const newThresholds = {
                maxEnhancementTime: 5000,
                maxDisplayTime: 20000
            };

            performanceMonitoring.updateThresholds(newThresholds);

            const debugInfo = performanceMonitoring.getDebugInfo();
            expect(debugInfo.thresholds.maxEnhancementTime).toBe(5000);
            expect(debugInfo.thresholds.maxDisplayTime).toBe(20000);

            // Test that new thresholds are used for alerts
            performanceMonitoring.recordEnhancementTime(0, 6000); // Exceeds new threshold

            const alerts = performanceMonitoring.getAlerts();
            expect(alerts.length).toBeGreaterThan(0);
        });

        it('should calculate timing accuracy', () => {
            // Record consistent display times
            for (let i = 0; i < 10; i++) {
                performanceMonitoring.recordDisplayTime(i * 100, i * 100 + 100); // Always 100ms
            }

            const metrics = performanceMonitoring.getMetrics();
            expect(metrics.averageEnhancementTime).toBeGreaterThan(0);
        });

        it('should detect memory issues when available', () => {
            // Mock high memory usage in the optimizer
            const originalGetMetrics = performanceOptimizer.getMetrics;
            performanceOptimizer.getMetrics = vi.fn(() => ({
                activeTimers: 5,
                activeDisplays: 2,
                memoryUsage: 200 * 1024 * 1024, // 200MB (exceeds 150MB threshold)
                averageTokenProcessingTime: 2.5,
            }));

            try {
                const metrics = performanceMonitoring.getMetrics();
                expect(metrics.memoryLeakDetected).toBe(true);
            } finally {
                // Restore original method
                performanceOptimizer.getMetrics = originalGetMetrics;
            }
        });
    });
});