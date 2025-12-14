import React, { useState, useMemo } from 'react';
import { VirtualizedMasonryGrid } from './VirtualizedMasonryGrid';
import { createVirtualizedImageRenderer } from './VirtualizedMasonryImageRenderer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
// Card components not available, using div instead
import type { GeneratedImage } from '../types';

interface VirtualizedMasonryExampleProps {
    images: GeneratedImage[];
    onDelete: (id: string) => void;
    onEdit: (image: GeneratedImage) => void;
}

/**
 * Example usage of the VirtualizedMasonryGrid with performance monitoring
 */
export function VirtualizedMasonryExample({
    images,
    onDelete,
    onEdit,
}: VirtualizedMasonryExampleProps) {
    const [showPerformance, setShowPerformance] = useState(false);
    const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

    // Memoized renderer to prevent recreation
    const renderer = useMemo(
        () => createVirtualizedImageRenderer(onDelete, onEdit),
        [onDelete, onEdit]
    );

    const handlePerformanceUpdate = (metrics: any) => {
        setPerformanceMetrics(metrics);
    };

    const getPerformanceColor = (value: number, thresholds: [number, number]) => {
        if (value >= thresholds[1]) return 'text-green-600';
        if (value >= thresholds[0]) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Controls */}
            <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Virtualized Masonry Grid</h3>
                    <Badge variant="outline">{images.length} items</Badge>
                    {performanceMetrics && (
                        <Badge variant="secondary">
                            {performanceMetrics.visibleItems} visible
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={showPerformance ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowPerformance(!showPerformance)}
                    >
                        Performance Monitor
                    </Button>
                </div>
            </div>

            {/* Performance Metrics */}
            {showPerformance && performanceMetrics && (
                <div className="m-4 mb-0 border rounded-lg bg-card">
                    <div className="p-4 pb-3 border-b">
                        <h4 className="text-sm font-semibold">Performance Metrics</h4>
                    </div>
                    <div className="p-4 pt-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">FPS</div>
                                <div className={`font-semibold ${getPerformanceColor(performanceMetrics.fps, [30, 50])}`}>
                                    {performanceMetrics.fps}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Render Time</div>
                                <div className={`font-semibold ${getPerformanceColor(20 - performanceMetrics.renderTime, [10, 15])}`}>
                                    {performanceMetrics.renderTime.toFixed(1)}ms
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Memory</div>
                                <div className={`font-semibold ${getPerformanceColor(200 - performanceMetrics.memoryUsage, [100, 150])}`}>
                                    {performanceMetrics.memoryUsage}MB
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Efficiency</div>
                                <div className="font-semibold text-blue-600">
                                    {((performanceMetrics.visibleItems / images.length) * 100).toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Scroll Performance: {performanceMetrics.scrollPerformance}%</span>
                                <span>
                                    Rendering {performanceMetrics.visibleItems} of {performanceMetrics.totalItems} items
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid Container */}
            <div className="flex-1 overflow-hidden">
                <VirtualizedMasonryGrid
                    items={images}
                    renderer={renderer}
                    columnWidth={250}
                    gap={8}
                    overscan={5}
                    bufferSize={200}
                    enablePerformanceMonitoring={showPerformance}
                    onPerformanceUpdate={handlePerformanceUpdate}
                    className="w-full h-full"
                />
            </div>

            {/* Performance Tips */}
            {showPerformance && (
                <div className="p-4 border-t bg-muted/30 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-green-600 mb-2">Optimization Features</h4>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>✓ Virtualized rendering (only visible items)</li>
                                <li>✓ Viewport culling with overscan buffer</li>
                                <li>✓ Lazy image loading</li>
                                <li>✓ Memoized components and calculations</li>
                                <li>✓ GPU-accelerated transforms</li>
                                <li>✓ CSS containment for performance</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-600 mb-2">Performance Tips</h4>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>• Reduce overscan if FPS is low</li>
                                <li>• Increase buffer size for smoother scrolling</li>
                                <li>• Use smaller column widths for more columns</li>
                                <li>• Enable hardware acceleration in browser</li>
                                <li>• Consider image compression for large datasets</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VirtualizedMasonryExample;