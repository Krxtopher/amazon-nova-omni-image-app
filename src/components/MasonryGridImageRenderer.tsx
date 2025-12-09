import { useState } from 'react';
import type { GeneratedImage } from '../types';
import type { MasonryItemRendererProps } from './MasonryGrid';
import { Button } from './ui/button';
import { Trash2, Edit2, Loader2, Download } from 'lucide-react';

interface ImageMasonryItem extends GeneratedImage {
    // MasonryGrid expects id, width, height which GeneratedImage already has
}

interface ImageRendererProps extends MasonryItemRendererProps {
    item: ImageMasonryItem;
    onDelete: (id: string) => void;
    onEdit: (image: GeneratedImage) => void;
}

/**
 * Renderer component for displaying GeneratedImage items in MasonryGrid
 */
export function MasonryImageRenderer({
    item,
    displayWidth: _displayWidth,
    displayHeight: _displayHeight,
    isVisible,
    onDelete,
    onEdit
}: ImageRendererProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const renderContent = () => {
        // Show loading spinner for pending/generating states
        if (item.status === 'pending' || item.status === 'generating') {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 border-2 border-dashed border-gray-400/20 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            );
        }

        // Show error state
        if (item.status === 'error' || imageError) {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4">
                    <p className="text-sm text-destructive text-center">
                        {item.error || 'Failed to load image'}
                    </p>
                </div>
            );
        }

        // Show completed image
        if (item.status === 'complete' && item.url) {
            return (
                <img
                    src={item.url}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    loading={isVisible ? 'eager' : 'lazy'}
                />
            );
        }

        return null;
    };

    return (
        <div
            className="relative group rounded-lg overflow-hidden bg-muted w-full h-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {renderContent()}

            {/* Action buttons - shown on hover for complete images */}
            {isHovered && item.status === 'complete' && (
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = item.url!;
                            link.download = `image-${item.id}.png`;
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
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 shadow-lg"
                        aria-label="Edit image"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => onDelete(item.id)}
                        className="h-8 w-8 shadow-lg"
                        aria-label="Delete image"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Prompt overlay - shown on hover for complete images */}
            {isHovered && item.status === 'complete' && item.prompt && (
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8 pointer-events-none">
                    <p className="text-white text-sm leading-relaxed">
                        {item.prompt}
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Creates a renderer function for use with MasonryGrid
 */
export function createImageRenderer(
    onDelete: (id: string) => void,
    onEdit: (image: GeneratedImage) => void
) {
    return (props: MasonryItemRendererProps) => (
        <MasonryImageRenderer
            {...props}
            item={props.item as ImageMasonryItem}
            onDelete={onDelete}
            onEdit={onEdit}
        />
    );
}
