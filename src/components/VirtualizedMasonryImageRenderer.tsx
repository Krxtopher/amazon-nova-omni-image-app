import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GeneratedImage } from '../types';
import type { MasonryItemRendererProps } from './VirtualizedMasonryGrid';
import { Button } from './ui/button';
import { Trash2, Edit2, Download, Copy, Check } from 'lucide-react';
import { MagicalImagePlaceholder } from './MagicalImagePlaceholder';

interface ImageMasonryItem extends GeneratedImage {
    // MasonryGrid expects id, width, height which GeneratedImage already has
}

interface VirtualizedImageRendererProps extends MasonryItemRendererProps {
    item: ImageMasonryItem;
    onDelete: (id: string) => void;
    onEdit: (image: GeneratedImage) => void;
}

/**
 * Calculate the optimal number of lines for text truncation based on available height
 */
function calculateLineClamp(
    availableHeight: number,
    fontSize: number = 14,
    lineHeight: number = 1.5,
    padding: number = 32
): number {
    const adjustedHeight = availableHeight - padding;
    const lineHeightPx = fontSize * lineHeight;
    const maxLines = Math.floor(adjustedHeight / lineHeightPx);
    return Math.max(1, Math.min(maxLines, 8));
}

/**
 * Optimized image component with lazy loading and memory management
 */
const OptimizedImage = React.memo(({
    src,
    alt,
    className,
    onLoad,
    onError,
    onClick,
    isVisible,
}: {
    src: string;
    alt: string;
    className: string;
    onLoad: () => void;
    onError: () => void;
    onClick: () => void;
    isVisible: boolean;
}) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [shouldLoad, setShouldLoad] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Only start loading when visible
    useEffect(() => {
        if (isVisible && !shouldLoad) {
            setShouldLoad(true);
        }
    }, [isVisible, shouldLoad]);

    // Handle image load
    const handleLoad = useCallback(() => {
        setIsLoaded(true);
        onLoad();
    }, [onLoad]);

    // Handle image error
    const handleError = useCallback(() => {
        setIsLoaded(false);
        onError();
    }, [onError]);

    if (!shouldLoad) {
        return (
            <div className={className} onClick={onClick}>
                <MagicalImagePlaceholder className="absolute inset-0" variant="basic" />
            </div>
        );
    }

    return (
        <>
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                className={className}
                onLoad={handleLoad}
                onError={handleError}
                onClick={onClick}
                loading="lazy"
                decoding="async"
                style={{
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease-out',
                }}
            />
            {!isLoaded && (
                <div className="absolute inset-0 bg-muted/30" />
            )}
        </>
    );
});

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Virtualized renderer component for displaying GeneratedImage items in MasonryGrid
 * Optimized for performance with minimal re-renders and efficient memory usage
 */
export const VirtualizedMasonryImageRenderer = React.memo(({
    item,
    displayWidth: _displayWidth,
    displayHeight,
    isVisible,
    onDelete,
    onEdit,
}: VirtualizedImageRendererProps) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [, setImageLoaded] = useState(false);

    // Memoized line clamps to prevent recalculation
    const lineClamps = useMemo(() => ({
        generating: calculateLineClamp(displayHeight, 14, 1.5, 32),
        hover: calculateLineClamp(displayHeight * 0.4, 14, 1.5, 32),
    }), [displayHeight]);

    // Reset states when item changes
    useEffect(() => {
        setImageError(false);
        setImageLoaded(false);
        setIsHovered(false);
        setIsCopied(false);
    }, [item.id, item.url]);

    // Memoized handlers to prevent unnecessary re-renders
    const handleImageError = useCallback(() => {
        setImageError(true);
    }, []);

    const handleImageLoad = useCallback(() => {
        setImageLoaded(true);
    }, []);

    const handleMouseEnter = useCallback(() => {
        if (item.status === 'complete') {
            setIsHovered(true);
        }
    }, [item.status]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    const handleCopyPrompt = useCallback(async () => {
        if (!item.prompt) return;

        try {
            await navigator.clipboard.writeText(item.prompt);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy prompt:', err);
        }
    }, [item.prompt]);

    const handleDownload = useCallback(() => {
        if (!item.url) return;

        // Detect file extension from image format
        let extension = 'png';
        if (item.url.includes('image/jpeg') || item.url.includes('data:image/jpeg')) {
            extension = 'jpg';
        } else if (item.url.includes('image/gif') || item.url.includes('data:image/gif')) {
            extension = 'gif';
        } else if (item.url.includes('image/webp') || item.url.includes('data:image/webp')) {
            extension = 'webp';
        }

        const baseFilename = `image-${item.id}`;

        // Download the image
        const imageLink = document.createElement('a');
        imageLink.href = item.url;
        imageLink.download = `${baseFilename}.${extension}`;
        document.body.appendChild(imageLink);
        imageLink.click();
        document.body.removeChild(imageLink);

        // Download the JSON file with Converse API parameters if available
        if (item.converseParams) {
            const jsonData = JSON.stringify(item.converseParams, null, 2);
            const jsonBlob = new Blob([jsonData], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(jsonBlob);

            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.download = `${baseFilename}-converse-params.json`;
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);

            URL.revokeObjectURL(jsonUrl);
        }
    }, [item.url, item.id, item.converseParams]);

    const handleEdit = useCallback(() => {
        onEdit(item);
    }, [onEdit, item]);

    const handleDelete = useCallback(() => {
        onDelete(item.id);
    }, [onDelete, item.id]);

    const handleImageClick = useCallback(() => {
        navigate(`/image/${item.id}`);
    }, [navigate, item.id]);

    // Memoized content rendering
    const renderContent = useMemo(() => {
        // Show magical loading effect for pending/generating states
        if (item.status === 'pending' || item.status === 'generating') {
            return (
                <div className="absolute inset-0">
                    <MagicalImagePlaceholder className="absolute inset-0" variant="shader" />
                    {item.prompt && (
                        <div className="absolute inset-0 flex items-center justify-center p-4 z-10 mix-blend-overlay">
                            <div
                                className="text-white text-center text-sm leading-relaxed max-w-full overflow-hidden select-none"
                                style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: lineClamps.generating,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {item.prompt}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Show error state
        if (item.status === 'error' || imageError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4 gap-3">
                    <p className="text-sm text-destructive text-center flex-1 flex items-center">
                        {item.error || 'Failed to load image'}
                    </p>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        className="shrink-0"
                        aria-label="Delete error message"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            );
        }

        // Show completed image
        if (item.status === 'complete' && item.url) {
            return (
                <>
                    <OptimizedImage
                        src={item.url}
                        alt={item.prompt}
                        className="w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-105 cursor-pointer"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        onClick={handleImageClick}
                        isVisible={isVisible}
                    />
                    {/* Vignette overlay - fades in on hover */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle, transparent 30%, rgba(0, 0, 0, 0.1) 80%, rgba(0, 0, 0, 0.2) 100%)',
                        }}
                    />
                </>
            );
        }

        return null;
    }, [
        item.status,
        item.prompt,
        item.error,
        item.url,
        imageError,
        lineClamps.generating,
        handleDelete,
        handleImageError,
        handleImageLoad,
        handleImageClick,
        isVisible,
    ]);

    // Memoized action buttons
    const actionButtons = useMemo(() => {
        if (!isHovered || item.status !== 'complete') return null;

        return (
            <div className="absolute top-2 right-2 flex gap-2 z-20">
                <Button
                    size="icon"
                    variant="secondary"
                    onClick={handleDownload}
                    className="h-8 w-8 shadow-lg backdrop-blur-sm"
                    style={{
                        backdropFilter: 'brightness(0.7) saturate(1.5)',
                        WebkitBackdropFilter: 'brightness(0.7) saturate(1.5)',
                    }}
                    aria-label="Download image"
                >
                    <Download className="h-4 w-4" />
                </Button>
                <Button
                    size="icon"
                    variant="secondary"
                    onClick={handleEdit}
                    className="h-8 w-8 shadow-lg backdrop-blur-sm"
                    style={{
                        backdropFilter: 'brightness(0.7) saturate(1.5)',
                        WebkitBackdropFilter: 'brightness(0.7) saturate(1.5)',
                    }}
                    aria-label="Edit image"
                >
                    <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                    size="icon"
                    variant="destructive"
                    onClick={handleDelete}
                    className="h-8 w-8 shadow-lg backdrop-blur-sm"
                    style={{
                        backdropFilter: 'brightness(0.7) saturate(1.5)',
                        WebkitBackdropFilter: 'brightness(0.7) saturate(1.5)',
                    }}
                    aria-label="Delete image"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        );
    }, [isHovered, item.status, handleDownload, handleEdit, handleDelete]);

    // Memoized prompt overlay
    const promptOverlay = useMemo(() => {
        if (item.status !== 'complete' || !item.prompt) return null;

        return (
            <div
                className={`absolute bottom-0 left-0 right-0 z-10 bg-linear-to-t from-neutral-800/80 via-black/40 to-transparent p-4 pt-8 transition-opacity duration-200 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <p className="text-white text-sm leading-relaxed flex items-start gap-2 select-none">
                    <span
                        className="flex-1 overflow-hidden"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: lineClamps.hover,
                            WebkitBoxOrient: 'vertical',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        Prompt: {item.prompt}
                    </span>
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
        );
    }, [item.status, item.prompt, isHovered, lineClamps.hover, handleCopyPrompt, isCopied]);

    return (
        <div
            className={`relative rounded-lg overflow-hidden bg-muted w-full h-full ${item.status === 'complete' ? 'group' : ''
                }`}
            style={{
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.3)',
                contain: 'layout style paint', // CSS containment for performance
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Inner border overlay - only for complete images */}
            {item.status === 'complete' && (
                <div
                    className="absolute inset-0 pointer-events-none rounded-lg transition-all duration-200 z-30"
                    style={{
                        boxShadow: isHovered ? 'inset 0 0 0 3px white' : 'inset 0 0 0 0px white',
                    }}
                />
            )}

            {renderContent}
            {actionButtons}
            {promptOverlay}
        </div>
    );
});

VirtualizedMasonryImageRenderer.displayName = 'VirtualizedMasonryImageRenderer';

/**
 * Creates a renderer function for use with VirtualizedMasonryGrid
 */
export function createVirtualizedImageRenderer(
    onDelete: (id: string) => void,
    onEdit: (image: GeneratedImage) => void
) {
    return (props: MasonryItemRendererProps) => (
        <VirtualizedMasonryImageRenderer
            {...props}
            item={props.item as ImageMasonryItem}
            onDelete={onDelete}
            onEdit={onEdit}
        />
    );
}

export default VirtualizedMasonryImageRenderer;