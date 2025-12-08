import type { GeneratedImage } from '../types';
import { ImageCard } from './ImageCard';

interface GalleryGridProps {
    images: GeneratedImage[];
    onImageDelete: (id: string) => void;
    onImageEdit: (image: GeneratedImage) => void;
}

/**
 * GalleryGrid component displays generated images in a responsive grid layout
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

    return (
        <div
            className="grid gap-4 w-full"
            style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                maxWidth: '100%',
            }}
        >
            {images.map((image) => (
                <ImageCard
                    key={image.id}
                    image={image}
                    onDelete={() => onImageDelete(image.id)}
                    onEdit={() => onImageEdit(image)}
                />
            ))}
        </div>
    );
}
