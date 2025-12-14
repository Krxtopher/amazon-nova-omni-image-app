import React, { useState, useMemo } from 'react';
import { VirtualizedMasonryGrid } from './VirtualizedMasonryGrid';
import { VMasonryGrid, HMasonryGrid } from './MasonryGrid';
import { createVirtualizedImageRenderer } from './VirtualizedMasonryImageRenderer';
import { createImageRenderer } from './MasonryGridImageRenderer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { GeneratedImage } from '../types';

interface MasonryGridComparisonProps {
    images: GeneratedImage[];
    onDelete: (id: string) => void;
    onEdit: (image: GeneratedImage) => void;
}

type GridType = 'virtualized' | 'vertical' | 'horizontal';

/**
 * Performance comparison component for different MasonryGrid implementations
 */
export function MasonryGridComparison({
    images,
    onDelete,
    onEdit,
}: MasonryGridComparisonProps) {
    const [activeGrid, setActiveGrid] = useState<GridType>('virtualized');
    const [performanceMetrics, setPerformanceMetrics] = useState<{
        renderTime: number;
        itemsRendered: number;
        memoryUsage?: number;
    } | null>(null);

    // Memoized renderers to prevent recreation
    const virtualizedRenderer = useMemo(
        () => createVirtualizedImageRenderer(onDelete, onEdit),
        [onDelete, onEdit]
    );

    const standardRenderer = useMemo(
        () => createImageRenderer(onDelete, onEdit),
        [onDelete, onEdit]
    );

    // Performance measurement wrapper
    const measurePerformance = (gridType: GridType) => {
        const startTime = performance.now();

        // Use requestAnimationFrame to measure after render
        requestAnimationFrame(() => {
            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Estimate memory usage (simplified)
            const itemsRendered = gridType === 'virtualized'
                ? Math.min(images.length, 50) // Estimated visible items
                : images.length;

            setPerformanceMetrics({
                renderTime,
                itemsRendered,
            });
        });
    };

    const handleGridChange = (gridType: GridType) => {
        setActiveGrid(gridType);
        measurePerformance(gridType);
    };

    const renderGrid = () => {
        const commonProps = {
            items: images,
            columnWidth: 250,
            gap: 8,
            className: "w-full h-full",
        };

        switch (activeGrid) {
            case 'virtualized':
                return (
                    <VirtualizedMasonryGrid
                        {...commonProps}
                        renderer={virtualizedRenderer}
                        overscan={5}
                        bufferSize={200}
                    />
                );
            case 'vertical':
                return (
                    <VMasonryGrid
                        {...commonProps}
                        renderer={standardRenderer}
                        maxItemSize={250}
                    />
                );
            case 'horizontal':
                return (
                    <HMasonryGrid
                        {...commonProps}
                        renderer={standardRenderer}
                        maxItemSize={250}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Controls */}
            <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Masonry Grid Comparison</h3>
                    <Badge variant="outline">{images.length} items</Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={activeGrid === 'virtualized' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleGridChange('virtualized')}
                    >
                        Virtualized
                        <Badge variant="secondary" className="ml-2">
                            New
                        </Badge>
                    </Button>
                    <Button
                        variant={activeGrid === 'vertical' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleGridChange('vertical')}
                    >
                        Vertical
                    </Button>
                    <Button
                        variant={activeGrid === 'horizontal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleGridChange('horizontal')}
                    >
                        Horizontal
                    </Button>
                </div>
            </div>

            {/* Performance Metrics */}
            {performanceMetrics && (
                <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 text-sm">
                    <span>Render Time: <strong>{performanceMetrics.renderTime.toFixed(2)}ms</strong></span>
                    <span>Items Rendered: <strong>{performanceMetrics.itemsRendered}</strong></span>
                    <span>Efficiency: <strong>{((performanceMetrics.itemsRendered / images.length) * 100).toFixed(1)}%</strong></span>
                </div>
            )}

            {/* Grid Container */}
            <div className="flex-1 overflow-hidden">
                {renderGrid()}
            </div>

            {/* Performance Notes */}
            <div className="p-4 border-t bg-muted/30 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <h4 className="font-semibold text-green-600 mb-1">Virtualized Grid</h4>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>• Only renders visible items</li>
                            <li>• Viewport culling</li>
                            <li>• Smooth scrolling</li>
                            <li>• Memory efficient</li>
                            <li>• Best for large datasets</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-600 mb-1">Vertical Grid</h4>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>• Column-based layout</li>
                            <li>• Renders all items</li>
                            <li>• Simple implementation</li>
                            <li>• Good for small datasets</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-purple-600 mb-1">Horizontal Grid</h4>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>• Row-based layout</li>
                            <li>• Justified rows</li>
                            <li>• Renders all items</li>
                            <li>• Good for uniform heights</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MasonryGridComparison;