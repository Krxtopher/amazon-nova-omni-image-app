import React, { useRef, useMemo } from 'react';
import { useImageStore } from '@/stores/imageStore';
import type { GeneratedImage } from '../types';
import { FixedMasonryGrid } from './FixedMasonryGrid';
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
    const { images } = useImageStore();
    const containerRef = useRef<HTMLDivElement>(null);

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
            <FixedMasonryGrid
                items={sortedImages}
                renderer={renderer}
                columnWidth={350}
                gap={22}
                overscan={5}
                bufferSize={200}
                className="w-full"
            />
        </div>
    );
});

export default SimpleVirtualizedGallery;