import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PerformanceMetrics {
    fps: number;
    renderTime: number;
    visibleItems: number;
    totalItems: number;
    memoryUsage: number;
    scrollPerformance: number;
}

interface PerformanceDashboardProps {
    metrics: PerformanceMetrics | null;
    isEnabled: boolean;
    onToggle: () => void;
}

/**
 * Performance dashboard for monitoring virtualized grid performance
 */
export function PerformanceDashboard({
    metrics,
    isEnabled,
    onToggle,
}: PerformanceDashboardProps) {
    const [history, setHistory] = useState<PerformanceMetrics[]>([]);

    // Track performance history
    useEffect(() => {
        if (metrics && isEnabled) {
            setHistory(prev => {
                const newHistory = [...prev, metrics];
                // Keep only last 60 samples (1 minute at 1 sample/second)
                return newHistory.slice(-60);
            });
        }
    }, [metrics, isEnabled]);

    const getPerformanceGrade = (metrics: PerformanceMetrics) => {
        let score = 0;

        // FPS score (40% weight)
        if (metrics.fps >= 55) score += 40;
        else if (metrics.fps >= 45) score += 30;
        else if (metrics.fps >= 30) score += 20;
        else score += 10;

        // Scroll performance (30% weight)
        score += (metrics.scrollPerformance / 100) * 30;

        // Render time (30% weight)
        if (metrics.renderTime <= 5) score += 30;
        else if (metrics.renderTime <= 10) score += 25;
        else if (metrics.renderTime <= 20) score += 15;
        else score += 5;

        if (score >= 85) return { grade: 'A', color: 'text-green-600' };
        if (score >= 70) return { grade: 'B', color: 'text-blue-600' };
        if (score >= 55) return { grade: 'C', color: 'text-yellow-600' };
        if (score >= 40) return { grade: 'D', color: 'text-orange-600' };
        return { grade: 'F', color: 'text-red-600' };
    };

    const getMetricColor = (value: number, thresholds: [number, number]) => {
        if (value >= thresholds[1]) return 'text-green-600';
        if (value >= thresholds[0]) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getEfficiency = (metrics: PerformanceMetrics) => {
        return ((metrics.visibleItems / metrics.totalItems) * 100).toFixed(1);
    };

    const getAverageMetrics = () => {
        if (history.length === 0) return null;

        const avg = history.reduce(
            (acc, curr) => ({
                fps: acc.fps + curr.fps,
                renderTime: acc.renderTime + curr.renderTime,
                memoryUsage: acc.memoryUsage + curr.memoryUsage,
                scrollPerformance: acc.scrollPerformance + curr.scrollPerformance,
            }),
            { fps: 0, renderTime: 0, memoryUsage: 0, scrollPerformance: 0 }
        );

        const count = history.length;
        return {
            fps: Math.round(avg.fps / count),
            renderTime: Math.round((avg.renderTime / count) * 10) / 10,
            memoryUsage: Math.round(avg.memoryUsage / count),
            scrollPerformance: Math.round(avg.scrollPerformance / count),
        };
    };

    if (!isEnabled) {
        return (
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/30">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                        Performance monitoring is disabled
                    </p>
                    <Button onClick={onToggle} size="sm">
                        Enable Monitoring
                    </Button>
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/30">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                        Collecting performance data...
                    </p>
                    <Button onClick={onToggle} variant="outline" size="sm">
                        Disable Monitoring
                    </Button>
                </div>
            </div>
        );
    }

    const performanceGrade = getPerformanceGrade(metrics);
    const averageMetrics = getAverageMetrics();
    const efficiency = getEfficiency(metrics);

    return (
        <div className="border rounded-lg bg-card">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Performance Dashboard</h3>
                    <Badge variant="outline">Live</Badge>
                    <Badge className={performanceGrade.color} variant="secondary">
                        Grade {performanceGrade.grade}
                    </Badge>
                </div>
                <Button onClick={onToggle} variant="outline" size="sm">
                    Disable
                </Button>
            </div>

            {/* Current Metrics */}
            <div className="p-4">
                <h4 className="text-sm font-medium mb-3">Current Performance</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-muted-foreground">FPS</div>
                        <div className={`text-2xl font-bold ${getMetricColor(metrics.fps, [30, 50])}`}>
                            {metrics.fps}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground">Render Time</div>
                        <div className={`text-2xl font-bold ${getMetricColor(20 - metrics.renderTime, [10, 15])}`}>
                            {metrics.renderTime.toFixed(1)}ms
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground">Memory</div>
                        <div className={`text-2xl font-bold ${getMetricColor(200 - metrics.memoryUsage, [100, 150])}`}>
                            {metrics.memoryUsage}MB
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground">Efficiency</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {efficiency}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Average Metrics */}
            {averageMetrics && (
                <div className="px-4 pb-4">
                    <h4 className="text-sm font-medium mb-3">Session Averages</h4>
                    <div className="grid grid-cols-4 gap-4 text-xs">
                        <div className="text-center">
                            <div className="text-muted-foreground">Avg FPS</div>
                            <div className="font-semibold">{averageMetrics.fps}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-muted-foreground">Avg Render</div>
                            <div className="font-semibold">{averageMetrics.renderTime}ms</div>
                        </div>
                        <div className="text-center">
                            <div className="text-muted-foreground">Avg Memory</div>
                            <div className="font-semibold">{averageMetrics.memoryUsage}MB</div>
                        </div>
                        <div className="text-center">
                            <div className="text-muted-foreground">Scroll Quality</div>
                            <div className="font-semibold">{averageMetrics.scrollPerformance}%</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Bar */}
            <div className="px-4 py-2 border-t bg-muted/30 text-xs">
                <div className="flex items-center justify-between">
                    <span>
                        Rendering {metrics.visibleItems} of {metrics.totalItems} items
                    </span>
                    <span>
                        Samples: {history.length}/60
                    </span>
                </div>
            </div>

            {/* Performance Tips */}
            <div className="p-4 border-t bg-muted/10">
                <h4 className="text-sm font-medium mb-2">Performance Tips</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                    {metrics.fps < 30 && (
                        <div className="text-red-600">• Low FPS: Consider reducing overscan or optimizing renderers</div>
                    )}
                    {metrics.renderTime > 16 && (
                        <div className="text-yellow-600">• Slow rendering: Use React.memo and optimize calculations</div>
                    )}
                    {metrics.memoryUsage > 100 && (
                        <div className="text-orange-600">• High memory: Enable more aggressive image lazy loading</div>
                    )}
                    {parseFloat(efficiency) > 50 && (
                        <div className="text-blue-600">• Consider increasing virtualization aggressiveness</div>
                    )}
                    {metrics.fps >= 50 && metrics.renderTime <= 10 && (
                        <div className="text-green-600">• Excellent performance! Grid is well optimized</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PerformanceDashboard;