import { useState } from 'react';
import type { GeneratedImage } from '../types';
import type { MasonryItemRendererProps } from './MasonryGrid';
import { Button } from './ui/button';
import { Trash2, Edit2, Loader2, Download, Copy, Check } from 'lucide-react';

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
    const [isCopied, setIsCopied] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const handleCopyPrompt = async () => {
        if (item.prompt) {
            try {
                await navigator.clipboard.writeText(item.prompt);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy prompt:', err);
            }
        }
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
                <>
                    <img
                        src={item.url}
                        alt={item.prompt}
                        className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-107"
                        onError={handleImageError}
                        loading={isVisible ? 'eager' : 'lazy'}
                    />
                    {/* Vignette overlay - fades in on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle, transparent 30%, rgba(0, 0, 0, 0.1) 80%, rgba(0, 0, 0, 0.2) 100%)'
                        }}
                    />
                </>
            );
        }

        return null;
    };

    return (
        <div
            className="relative group rounded-lg overflow-hidden bg-muted w-full h-full"
            style={{
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 10px 20px rgba(0, 0, 0, 0.4)'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Inner border overlay */}
            <div
                className="absolute inset-0 pointer-events-none rounded-lg transition-all duration-200 z-30"
                style={{
                    boxShadow: isHovered ? 'inset 0 0 0 3px white' : 'inset 0 0 0 0px white'
                }}
            />
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
                        className="h-8 w-8 shadow-lg backdrop-blur-sm"
                        style={{
                            backdropFilter: 'brightness(0.7) saturate(1.5)',
                            WebkitBackdropFilter: 'brightness(0.7) saturate(1.5)'
                        }}
                        aria-label="Download image"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 shadow-lg backdrop-blur-sm"
                        style={{
                            backdropFilter: 'brightness(0.7) saturate(1.5)',
                            WebkitBackdropFilter: 'brightness(0.7) saturate(1.5)'
                        }}
                        aria-label="Edit image"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => onDelete(item.id)}
                        className="h-8 w-8 shadow-lg backdrop-blur-sm"
                        style={{
                            backdropFilter: 'brightness(0.7) saturate(1.5)',
                            WebkitBackdropFilter: 'brightness(0.7) saturate(1.5)'
                        }}
                        aria-label="Delete image"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Prompt overlay - always present but controlled by opacity */}
            {item.status === 'complete' && item.prompt && (
                <div
                    className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-neutral-800/80 via-black/40 to-transparent p-4 pt-8 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    <p className="text-white text-sm leading-relaxed flex items-start gap-2">
                        <span className="flex-1">{item.prompt}</span>
                        <button
                            onClick={handleCopyPrompt}
                            className="shrink-0 pointer-events-auto hover:bg-white/20 rounded p-1 transition-colors"
                            aria-label="Copy prompt to clipboard"
                        >
                            {isCopied ? (
                                <Check className="h-4 w-4 text-green-400" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </button>
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
