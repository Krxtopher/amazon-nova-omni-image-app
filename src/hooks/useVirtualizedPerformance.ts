import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
    fps: number;
    renderTime: number;
    visibleItems: number;
    totalItems: number;
    memoryUsage: number;
    scrollPerformance: number;
}

interface UseVirtualizedPerformanceOptions {
    enabled?: boolean;
    sampleSize?: number;
    updateInterval?: number;
}

/**
 * Hook for monitoring virtualized grid performance
 * Tracks FPS, render times, memory usage, and scroll performance
 */
export function useVirtualizedPerformance(
    options: UseVirtualizedPerformanceOptions = {}
) {
    const {
        enabled = true,
        sampleSize = 60,
        updateInterval = 1000,
    } = options;

    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 0,
        renderTime: 0,
        visibleItems: 0,
        totalItems: 0,
        memoryUsage: 0,
        scrollPerformance: 100,
    });

    const frameTimesRef = useRef<number[]>([]);
    const renderTimesRef = useRef<number[]>([]);
    const lastFrameTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>();
    const intervalRef = useRef<NodeJS.Timeout>();

    // FPS calculation
    const calculateFPS = useCallback(() => {
        if (!enabled) return;

        const now = performance.now();

        if (lastFrameTimeRef.current > 0) {
            const frameTime = now - lastFrameTimeRef.current;
            frameTimesRef.current.push(frameTime);

            // Keep only recent samples
            if (frameTimesRef.current.length > sampleSize) {
                frameTimesRef.current.shift();
            }
        }

        lastFrameTimeRef.current = now;
        animationFrameRef.current = requestAnimationFrame(calculateFPS);
    }, [enabled, sampleSize]);

    // Start FPS monitoring
    useEffect(() => {
        if (enabled) {
            calculateFPS();
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled, calculateFPS]);

    // Update metrics periodically
    useEffect(() => {
        if (!enabled) return;

        intervalRef.current = setInterval(() => {
            const frameTimes = frameTimesRef.current;
            const renderTimes = renderTimesRef.current;

            if (frameTimes.length > 0) {
                // Calculate average FPS
                const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
                const fps = Math.round(1000 / avgFrameTime);

                // Calculate average render time
                const avgRenderTime = renderTimes.length > 0
                    ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
                    : 0;

                // Estimate memory usage (simplified)
                const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

                // Calculate scroll performance (based on frame consistency)
                const frameTimeVariance = frameTimes.length > 1
                    ? frameTimes.reduce((variance, time) => {
                        const diff = time - avgFrameTime;
                        return variance + (diff * diff);
                    }, 0) / frameTimes.length
                    : 0;

                const scrollPerformance = Math.max(0, 100 - (frameTimeVariance / 10));

                setMetrics(prev => ({
                    ...prev,
                    fps: Math.min(fps, 60), // Cap at 60 FPS
                    renderTime: avgRenderTime,
                    memoryUsage: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
                    scrollPerformance: Math.round(scrollPerformance),
                }));

                // Clear old render times
                renderTimesRef.current = [];
            }
        }, updateInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, updateInterval]);

    // Method to record render time
    const recordRenderTime = useCallback((startTime: number, endTime: number) => {
        if (!enabled) return;

        const renderTime = endTime - startTime;
        renderTimesRef.current.push(renderTime);

        // Keep only recent samples
        if (renderTimesRef.current.length > sampleSize) {
            renderTimesRef.current.shift();
        }
    }, [enabled, sampleSize]);

    // Method to update item counts
    const updateItemCounts = useCallback((visible: number, total: number) => {
        if (!enabled) return;

        setMetrics(prev => ({
            ...prev,
            visibleItems: visible,
            totalItems: total,
        }));
    }, [enabled]);

    // Performance grade calculation
    const getPerformanceGrade = useCallback(() => {
        const { fps, scrollPerformance, renderTime } = metrics;

        let score = 0;

        // FPS score (40% weight)
        if (fps >= 55) score += 40;
        else if (fps >= 45) score += 30;
        else if (fps >= 30) score += 20;
        else score += 10;

        // Scroll performance score (30% weight)
        score += (scrollPerformance / 100) * 30;

        // Render time score (30% weight)
        if (renderTime <= 5) score += 30;
        else if (renderTime <= 10) score += 25;
        else if (renderTime <= 20) score += 15;
        else score += 5;

        if (score >= 85) return 'A';
        if (score >= 70) return 'B';
        if (score >= 55) return 'C';
        if (score >= 40) return 'D';
        return 'F';
    }, [metrics]);

    // Performance recommendations
    const getRecommendations = useCallback(() => {
        const recommendations: string[] = [];
        const { fps, renderTime, memoryUsage, visibleItems, totalItems } = metrics;

        if (fps < 30) {
            recommendations.push('Consider reducing overscan or buffer size');
        }

        if (renderTime > 16) {
            recommendations.push('Optimize renderer components with React.memo');
        }

        if (memoryUsage > 100) {
            recommendations.push('Consider implementing image lazy loading');
        }

        if (visibleItems / totalItems > 0.5) {
            recommendations.push('Increase virtualization aggressiveness');
        }

        return recommendations;
    }, [metrics]);

    return {
        metrics,
        recordRenderTime,
        updateItemCounts,
        getPerformanceGrade,
        getRecommendations,
        isEnabled: enabled,
    };
}

export default useVirtualizedPerformance;