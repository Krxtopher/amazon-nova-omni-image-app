import React, { useState, useMemo } from 'react';
import { useImageStore } from '@/stores/imageStore';
import type { GalleryItem, GeneratedImage, GeneratedText } from '../types';
import { VirtualizedGallery } from './VirtualizedGallery';
import { GalleryGrid } from './GalleryGrid';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PerformanceDashboard } from './PerformanceDashboard';
import { useVirtualizedPerformance } from '../hooks/useVirtualizedPerformance';

interface GalleryWithToggleProps {
    onImageDelete: (id: string) => void;
    onTextDelete: (id: string) => void;
    onImageEdit: (image: GeneratedImage) => void;
}

type GalleryMode = 'virtualized' | 'standard';

/**
 * Gallery component with toggle between virtualized and standard implementations
 * Useful for performance comparison and gradual migration
 */
export function GalleryWithToggle({
    onImageDelete,
    onTextDelete,
    onImageEdit,
}: GalleryWithToggleProps) {
    const { images, textItems } = useImageStore();
    const [mode, setMode] = useState<GalleryMode>('virtualized');
    const [showPerformance, setShowPerformance] = useState(false);

    // Performance monitoring for comparison
    const { metrics, isEnabled } = useVirtualizedPerformance({
        enabled: showPerformance && mode === 'virtualized',
    });

    // Memoized total items count
    const totalItems = useMemo(() => {
        return images.length + textItems.length;
    }, [images.length, textItems.length]);

    // Memoized sorted items for standard gallery
    const sortedItems = useMemo(() => {
        const allItems: GalleryItem[] = [...images, ...textItems];
        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [images, textItems]);

    const handleModeToggle = (newMode: GalleryMode) => {
        setMode(newMode);
        // Reset performance monitoring when switching modes
        if (newMode === 'standard') {
            setShowPerformance(false);
        }
    };

    const renderModeSelector = () => (
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Gallery</h3>
                <Badge variant="outline">{totalItems} items</Badge>
                {mode === 'virtualized' && (
                    <Badge variant="secondary">Virtualized</Badge>
                )}
            </div>

            <div className="flex items-center gap-2">
                {mode === 'virtualized' && (
                    <Button
                        variant={showPerformance ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowPerformance(!showPerformance)}
                    >
                        Performance
                    </Button>
                )}

                <div className="flex border rounded-md">
                    <Button
                        variant={mode === 'virtualized' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleModeToggle('virtualized')}
                        className="rounded-r-none"
                    >
                        Virtualized
                    </Button>
                    <Button
                        variant={mode === 'standard' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleModeToggle('standard')}
                        className="rounded-l-none"
                    >
                        Standard
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderPerformanceInfo = () => {
        if (mode === 'standard') {
            return (
                <div className="p-4 border-b bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-yellow-700 dark:text-yellow-300">
                            Standard mode renders all {totalItems} items at once.
                            Performance may degrade with large datasets.
                        </span>
                    </div>
                </div>
            );
        }

        if (mode === 'virtualized' && !showPerformance) {
            return (
                <div className="p-4 border-b bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 dark:text-green-300">
                            Virtualized mode only renders visible items for optimal performance.
                        </span>
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderGallery = () => {
        if (mode === 'virtualized') {
            return (
                <VirtualizedGallery
                    onImageDelete={onImageDelete}
                    onTextDelete={onTextDelete}
                    onImageEdit={onImageEdit}
                />
            );
        }

        return (
            <GalleryGrid
                items={sortedItems}
                onImageDelete={onImageDelete}
                onTextDelete={onTextDelete}
                onImageEdit={onImageEdit}
            />
        );
    };

    return (
        <div className="flex flex-col h-full">
            {renderModeSelector()}
            {renderPerformanceInfo()}

            {/* Performance Dashboard */}
            {showPerformance && mode === 'virtualized' && (
                <div className="p-4 border-b">
                    <PerformanceDashboard
                        metrics={metrics}
                        isEnabled={isEnabled}
                        onToggle={() => setShowPerformance(!showPerformance)}
                    />
                </div>
            )}

            {/* Gallery Content */}
            <div className="flex-1 overflow-hidden">
                {renderGallery()}
            </div>

            {/* Performance Tips */}
            {mode === 'standard' && totalItems > 100 && (
                <div className="p-4 border-t bg-muted/30 text-sm">
                    <div className="flex items-center gap-2 text-amber-600">
                        <div className="w-4 h-4">⚠️</div>
                        <span>
                            With {totalItems} items, consider switching to Virtualized mode for better performance.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GalleryWithToggle;