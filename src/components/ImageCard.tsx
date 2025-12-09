import { useState } from 'react';
import type { GeneratedImage } from '../types';
import { Button } from './ui/button';
import { Trash2, Edit2, Loader2, Download } from 'lucide-react';

interface ImageCardProps {
    image: GeneratedImage;
    onDelete: () => void;
    onEdit: () => void;
}

/**
 * ImageCard component displays a generated image with hover actions
 * Requirements: 3.1, 3.5, 8.1, 4.1, 4.4, 5.1
 */
export function ImageCard({ image, onDelete, onEdit }: ImageCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const renderContent = () => {
        // Show loading spinner for pending/generating states
        if (image.status === 'pending' || image.status === 'generating') {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            );
        }

        // Show error state
        if (image.status === 'error' || imageError) {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4">
                    <p className="text-sm text-destructive text-center">
                        {image.error || 'Failed to load image'}
                    </p>
                </div>
            );
        }

        // Show completed image
        if (image.status === 'complete' && image.url) {
            return (
                <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                />
            );
        }

        return null;
    };

    return (
        <div
            className="relative group rounded-lg overflow-hidden bg-muted"
            style={{ aspectRatio: image.aspectRatio.replace(':', '/') }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {renderContent()}

            {/* Action buttons - shown on hover for complete images */}
            {isHovered && image.status === 'complete' && (
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = image.url!;
                            link.download = `image-${image.id}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="h-8 w-8 shadow-lg"
                        aria-label="Download image"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={onEdit}
                        className="h-8 w-8 shadow-lg"
                        aria-label="Edit image"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="destructive"
                        onClick={onDelete}
                        className="h-8 w-8 shadow-lg"
                        aria-label="Delete image"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Prompt overlay - shown on hover for complete images */}
            {isHovered && image.status === 'complete' && image.prompt && (
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8 pointer-events-none">
                    <p className="text-white text-sm leading-relaxed">
                        Foo {image.prompt}
                    </p>
                </div>
            )}
        </div>
    );
}
