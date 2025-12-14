import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useImageStore } from '@/stores/imageStore';
import type { GalleryItem, GeneratedImage, GeneratedText } from '../types';
import { VirtualizedMasonryGrid } from './VirtualizedMasonryGrid';
import { createVirtualizedImageRenderer } from './VirtualizedMasonryImageRenderer';
import { TextCard } from './TextCard';
import type { MasonryItemRendererProps } from './VirtualizedMasonryGrid';

interface DebugVirtualizedGalleryProps {
    onImageDelete: (id: string) => void;
    onTextDelete: (id: string) => void;
    onImageEdit: (image: GeneratedImage) => void;
}

/**
 * Debug version of VirtualizedGallery to help identify issues
 */
export const DebugVirtualizedGallery = React.memo(function DebugVirtualizedGallery({
    onImageDelete,
    onTextDelete,
    onImageEdit
}: DebugVirtualizedGalleryProps) {
    const { images, textItems } = useImageStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [debugInfo, setDebugInfo] = useState<any>({});

    // Type guards
    function isGeneratedImage(item: GalleryItem): item is GeneratedImage {
        return 'url' in item && 'width' in item && 'height' in item;
    }

    function isGeneratedText(item: GalleryItem): item is GeneratedText {
        return 'content' in item && !('url' in item);
    }

    // Memoized sorted items
    const sortedItems = useMemo(() => {
        const allItems: GalleryItem[] = [...images, ...textItems];
        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [images, textItems]);

    // Memoized renderer
    const renderer = useMemo(() => {
        const imageRenderer = createVirtualizedImageRenderer(onImageDelete, onImageEdit);

        return (props: MasonryItemRendererProps) => {
            const item = props.item as GalleryItem;

            if (isGeneratedImage(item)) {
                return imageRenderer(props);
            }

            if (isGeneratedText(item)) {
                const style = {
                    width: props.displayWidth,
                    height: props.displayHeight,
                };

                return (
                    <TextCard
                        id={item.id}
                        content={item.content}
                        prompt={item.prompt}
                        createdAt={item.createdAt}
                        onDelete={onTextDelete}
                        style={style}
                    />
                );
            }

            return <div />;
        };
    }, [onImageDelete, onImageEdit, onTextDelete]);

    // Transform text items for masonry grid
    const masonryItems = useMemo(() => {
        return sortedItems.map(item => {
            if (isGeneratedText(item)) {
                return { ...item, width: 350, height: 350 };
            }
            return item;
        });
    }, [sortedItems]);

    // Debug: Log container and scroll information
    useEffect(() => {
        const updateDebugInfo = () => {
            if (containerRef.current) {
                const container = containerRef.current;
                const rect = container.getBoundingClientRect();

                // Find scroll container
                let scrollContainer = container.parentElement;
                while (scrollContainer) {
                    const styles = window.getComputedStyle(scrollContainer);
                    if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
                        break;
                    }
                    scrollContainer = scrollContainer.parentElement;
                }

                const scrollRect = scrollContainer?.getBoundingClientRect();

                setDebugInfo({
                    containerRect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                    },
                    scrollContainer: scrollContainer?.tagName,
                    scrollRect: scrollRect ? {
                        top: scrollRect.top,
                        left: scrollRect.left,
                        width: scrollRect.width,
                        height: scrollRect.height,
                    } : null,
                    scrollTop: scrollContainer?.scrollTop || 0,
                    itemCount: masonryItems.length,
                });
            }
        };

        updateDebugInfo();

        // Update on scroll
        const handleScroll = () => updateDebugInfo();
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [masonryItems.length]);

    // Handle empty state
    if (sortedItems.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-center">
                <div className="space-y-2">
                    <p className="text-lg font-medium text-muted-foreground">
                        No content yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Enter a prompt above to generate your first image
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Debug Info */}
            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                <h4 className="font-bold mb-2">Debug Info:</h4>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>

            <div ref={containerRef} className="w-full">
                <VirtualizedMasonryGrid
                    items={masonryItems}
                    renderer={renderer}
                    columnWidth={350}
                    gap={22}
                    overscan={10} // Increased for debugging
                    bufferSize={500} // Increased for debugging
                    enablePerformanceMonitoring={true}
                    onPerformanceUpdate={(metrics) => {
                        console.log('Performance metrics:', metrics);
                    }}
                    className="w-full"
                />
            </div>
        </div>
    );
});

export default DebugVirtualizedGallery;