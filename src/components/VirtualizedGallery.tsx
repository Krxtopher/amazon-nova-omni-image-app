import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useImageStore } from '@/stores/imageStore';
import { useUIStore } from '@/stores/uiStore';
import type { GalleryItem, GeneratedImage, GeneratedText } from '../types';
import { VMasonryGrid, HMasonryGrid } from './MasonryGrid';
import { createImageRenderer } from './ImageCard';
import { TextCard } from './TextCard';
import type { MasonryItemRendererProps } from './MasonryGrid';

interface VirtualizedGalleryProps {
    onImageDelete: (id: string) => void;
    onTextDelete: (id: string) => void;
    onImageEdit: (image: GeneratedImage) => Promise<void>;
    enableStreamingDisplay?: boolean;
}

/**
 * Type guards
 */
function isGeneratedImage(item: GalleryItem): item is GeneratedImage {
    return 'url' in item && 'width' in item && 'height' in item;
}

function isGeneratedText(item: GalleryItem): item is GeneratedText {
    return 'content' in item && !('url' in item);
}

/**
 * VirtualizedGallery component that only loads and renders items as needed
 * Implements efficient pagination and viewport-based rendering
 */
export const VirtualizedGallery = React.memo(function VirtualizedGallery({
    onImageDelete,
    onTextDelete,
    onImageEdit,
    enableStreamingDisplay = false
}: VirtualizedGalleryProps) {
    const { images, textItems } = useImageStore();
    const { layoutMode, selectedPromptEnhancement } = useUIStore();
    const [visibleItems, setVisibleItems] = useState<GalleryItem[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    // Configuration
    const ITEMS_PER_PAGE = 20; // Load 20 items at a time

    // Memoized sorted items (only sort once when data changes)
    const sortedItems = useMemo(() => {
        const allItems: GalleryItem[] = [...images, ...textItems];
        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [images, textItems]);

    // Load more items function
    const loadMoreItems = useCallback(() => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);

        // Simulate async loading (in case we want to add database pagination later)
        setTimeout(() => {
            const currentCount = visibleItems.length;
            const nextItems = sortedItems.slice(currentCount, currentCount + ITEMS_PER_PAGE);

            if (nextItems.length === 0) {
                setHasMore(false);
            } else {
                setVisibleItems(prev => [...prev, ...nextItems]);
                setHasMore(currentCount + nextItems.length < sortedItems.length);
            }

            setIsLoadingMore(false);
        }, 100); // Small delay to prevent rapid firing
    }, [visibleItems.length, sortedItems, isLoadingMore, hasMore]);

    // Initialize with first batch of items
    useEffect(() => {
        const initialItems = sortedItems.slice(0, ITEMS_PER_PAGE);
        setVisibleItems(initialItems);
        setHasMore(sortedItems.length > ITEMS_PER_PAGE);
    }, [sortedItems]);

    // Set up intersection observer for infinite scroll
    useEffect(() => {
        if (!sentinelRef.current) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !isLoadingMore) {
                    loadMoreItems();
                }
            },
            {
                rootMargin: '200px', // Start loading 200px before sentinel comes into view
                threshold: 0.1
            }
        );

        observerRef.current.observe(sentinelRef.current);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, isLoadingMore, loadMoreItems]);

    // Handle new items being added (like new generations)
    useEffect(() => {
        // If new items are added to the beginning (newest first), 
        // we need to update visible items to include them
        const currentFirstItem = visibleItems[0];
        const sortedFirstItem = sortedItems[0];

        if (currentFirstItem && sortedFirstItem &&
            currentFirstItem.id !== sortedFirstItem.id) {
            // New items were added, refresh the visible items
            const newVisibleCount = Math.max(visibleItems.length, ITEMS_PER_PAGE);
            const newVisibleItems = sortedItems.slice(0, newVisibleCount);
            setVisibleItems(newVisibleItems);
            setHasMore(newVisibleCount < sortedItems.length);
        }
    }, [sortedItems, visibleItems]);

    // Memoized renderer
    const renderer = useMemo(() => {
        const imageRenderer = createImageRenderer(
            onImageDelete,
            onImageEdit,
            enableStreamingDisplay,
            selectedPromptEnhancement
        );

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
    }, [onImageDelete, onImageEdit, onTextDelete, enableStreamingDisplay, selectedPromptEnhancement]);

    // Transform text items for masonry grid - use all sorted items, not just visible ones
    const masonryItems = useMemo(() => {
        return sortedItems.map(item => {
            if (isGeneratedText(item)) {
                return { ...item, width: 350, height: 350 };
            }
            return item;
        });
    }, [sortedItems]);

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
        <div ref={containerRef} className="w-full">
            {layoutMode === 'vertical' ? (
                <VMasonryGrid
                    items={masonryItems}
                    renderer={renderer}
                    gap={22}
                    className="w-full"
                />
            ) : (
                <HMasonryGrid
                    items={masonryItems}
                    renderer={renderer}
                    maxItemSize={350}
                    gap={22}
                    className="w-full"
                />
            )}

            {/* Loading indicator and sentinel for infinite scroll */}
            {hasMore && (
                <div
                    ref={sentinelRef}
                    className="flex items-center justify-center py-8"
                >
                    {isLoadingMore && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm">Loading more...</span>
                        </div>
                    )}
                </div>
            )}

            {/* End indicator */}
            {!hasMore && visibleItems.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">
                        You've reached the end • {sortedItems.length} items total
                    </p>
                </div>
            )}
        </div>
    );
});