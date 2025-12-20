import React, { useRef, useMemo } from 'react';
import { useImageStore } from '@/stores/imageStore';
import { useUIStore } from '@/stores/uiStore';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { GeneratedImage } from '../types';
import { VMasonryGrid, HMasonryGrid } from './MasonryGrid';
import { createImageRenderer } from './ImageCard';

interface SimpleVirtualizedGalleryProps {
    onImageDelete: (id: string) => void;
    onTextDelete: (id: string) => void; // Kept for compatibility but not used
    onImageEdit: (image: GeneratedImage) => Promise<void>;
}



/**
 * Simplified VirtualizedGallery that only displays images (no text items)
 */
export const SimpleVirtualizedGallery = React.memo(function SimpleVirtualizedGallery({
    onImageDelete,
    onTextDelete: _onTextDelete, // Kept for compatibility but not used
    onImageEdit
}: SimpleVirtualizedGalleryProps) {
    // 🚀 PERFORMANCE FIX: Use selective subscriptions to prevent unnecessary re-renders
    // Only subscribe to the data this component actually needs
    const images = useImageStore(state => state.images);
    const hasMoreImages = useImageStore(state => state.hasMoreImages);
    const isLoadingMore = useImageStore(state => state.isLoadingMore);
    const loadMoreImages = useImageStore(state => state.loadMoreImages);
    const layoutMode = useUIStore(state => state.layoutMode);
    const containerRef = useRef<HTMLDivElement>(null);

    // Set up infinite scroll
    useInfiniteScroll({
        hasMore: hasMoreImages,
        isLoading: isLoadingMore,
        onLoadMore: loadMoreImages,
        threshold: 1000 // Load more when within 1000px of bottom
    });

    // Memoized sorted images (only sort once when data changes)
    const sortedImages = useMemo(() => {
        return [...images].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [images]);

    // Memoized renderer
    const renderer = useMemo(() => {
        return createImageRenderer(onImageDelete, onImageEdit);
    }, [onImageDelete, onImageEdit]);

    // Handle empty state
    if (sortedImages.length === 0) {
        // If we have more images available but none loaded yet, show loading state
        if (hasMoreImages) {
            return (
                <div className="flex items-center justify-center min-h-[400px] text-center">
                    <div className="space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <div className="space-y-2">
                            <p className="text-lg font-medium text-muted-foreground">
                                Loading your gallery...
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Getting your images ready
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        // Truly no images in database
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
                    items={sortedImages}
                    renderer={renderer}
                    gap={22}
                    className="w-full"
                />
            ) : (
                <HMasonryGrid
                    items={sortedImages}
                    renderer={renderer}
                    maxItemSize={350}
                    gap={22}
                    className="w-full"
                />
            )}

            {/* Loading indicator for infinite scroll */}
            {isLoadingMore && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-muted-foreground">Loading more images...</span>
                </div>
            )}

        </div>
    );
});

export default SimpleVirtualizedGallery;