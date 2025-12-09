import type { GeneratedImage } from '../types';
import { VMasonryGrid } from './MasonryGrid';
import { createImageRenderer } from './MasonryGridImageRenderer';

interface GalleryGridProps {
    images: GeneratedImage[];
    onImageDelete: (id: string) => void;
    onImageEdit: (image: GeneratedImage) => void;
}

/**
 * GalleryGrid component displays generated images in a responsive masonry layout
 * Requirements: 3.1, 3.2, 3.3, 3.4, 8.4
 */
export function GalleryGrid({ images, onImageDelete, onImageEdit }: GalleryGridProps) {
    // Handle empty state
    if (images.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-center">
                <div className="space-y-2">
                    <p className="text-lg font-medium text-muted-foreground">
                        No images yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Enter a prompt above to generate your first image
                    </p>
                </div>
            </div>
        );
    }

    const renderer = createImageRenderer(onImageDelete, onImageEdit);

    return (
        <VMasonryGrid
            items={images}
            renderer={renderer}
            maxItemSize={300}
            gap={8}
            className="w-full"
        />
    );
}
