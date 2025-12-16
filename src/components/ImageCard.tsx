import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GeneratedImage } from '../types';
import type { MasonryItemRendererProps } from './FixedMasonryGrid';
import { Button } from './ui/button';
import { Trash2, Edit2, Download, Copy, Check } from 'lucide-react';
import { MagicalImagePlaceholder } from './MagicalImagePlaceholder';
import { useImageData } from '../hooks/useImageData';

interface ImageMasonryItem extends GeneratedImage {
    // MasonryGrid expects id, width, height which GeneratedImage already has
}

interface ImageRendererProps extends MasonryItemRendererProps {
    item: ImageMasonryItem;
    onDelete: (id: string) => void;
    onEdit: (image: GeneratedImage) => Promise<void>;
}

/**
 * Calculate the optimal number of lines for text truncation based on available height
 */
function calculateLineClamp(availableHeight: number, fontSize: number = 14, lineHeight: number = 1.5, padding: number = 32): number {
    const adjustedHeight = availableHeight - padding;
    const lineHeightPx = fontSize * lineHeight;
    const maxLines = Math.floor(adjustedHeight / lineHeightPx);

    // Ensure we have at least 1 line and cap at a reasonable maximum
    return Math.max(1, Math.min(maxLines, 8));
}

/**
 * Renderer component for displaying GeneratedImage items in MasonryGrid
 */
export function ImageCard({
    item,
    displayWidth: _displayWidth,
    displayHeight,
    isVisible,
    onDelete,
    onEdit
}: ImageRendererProps) {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [shouldFadeIn, setShouldFadeIn] = useState(false);
    const [generatingTimer, setGeneratingTimer] = useState(0);

    // Load image data on demand when visible and status is complete
    const shouldLoadImage = isVisible && item.status === 'complete';
    const { imageUrl, isLoading: isLoadingImage } = useImageData(shouldLoadImage ? item.id : '');

    // Use loaded URL or fallback to item.url for backward compatibility
    const displayUrl = imageUrl || item.url;

    // Timer for generating state
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (item.status === 'generating') {
            setGeneratingTimer(0);
            interval = setInterval(() => {
                setGeneratingTimer(prev => prev + 1);
            }, 1000);
        } else {
            setGeneratingTimer(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [item.status]);

    // Calculate dynamic line clamps based on actual display height
    const generatingLineClamp = useMemo(() => {
        // For generating state, use the full display height
        return calculateLineClamp(displayHeight, 14, 1.5, 32);
    }, [displayHeight]);

    const hoverLineClamp = useMemo(() => {
        // For hover overlay, account for the gradient overlay space (roughly 30% of height)
        const overlayHeight = displayHeight * 0.4; // Conservative estimate for bottom overlay
        return calculateLineClamp(overlayHeight, 14, 1.5, 32);
    }, [displayHeight]);

    const handleImageError = () => {
        setImageError(true);
    };

    // Reset and trigger fade-in when image URL is loaded and becomes visible
    // Use a ref to track if we've already faded in this image to prevent re-triggering
    const hasFadedInRef = useRef(false);

    useEffect(() => {
        if (item.status === 'complete' && displayUrl && !isLoadingImage && !hasFadedInRef.current) {
            setShouldFadeIn(false);
            if (isVisible) {
                // Longer delay to ensure the opacity-0 class is applied first and visible
                const timer = setTimeout(() => {
                    setShouldFadeIn(true);
                    hasFadedInRef.current = true;
                }, 200);
                return () => clearTimeout(timer);
            }
        }
    }, [displayUrl, isVisible, item.status, isLoadingImage]);

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
        // Show queued state with magical effect
        if (item.status === 'queued') {
            return (
                <div className="absolute inset-0">
                    <MagicalImagePlaceholder className="absolute inset-0" variant="shader" />
                    {/* Queued status overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 mix-blend-overlay">
                        <div className="text-white text-xl font-semibold mb-2 bg-black/30 px-3 py-1 rounded">
                            Queued...
                        </div>
                        {item.prompt && (
                            <div
                                className="text-white text-center text-lg font-medium leading-relaxed max-w-full overflow-hidden select-none italic"
                                style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: generatingLineClamp,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {item.prompt}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Show magical loading effect for pending/generating states
        if (item.status === 'pending' || item.status === 'generating') {
            const formatTime = (seconds: number) => {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            return (
                <div className="absolute inset-0">
                    <MagicalImagePlaceholder className="absolute inset-0" variant="shader" />
                    {/* Timer and prompt overlay during generation */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 mix-blend-overlay">
                        {item.status === 'generating' && (
                            <div className="text-white text-xl font-mono font-bold mb-2 bg-black/30 px-3 py-1 rounded">
                                {formatTime(generatingTimer)}
                            </div>
                        )}
                        {item.prompt && (
                            <div
                                className="text-white text-center text-lg font-medium leading-relaxed max-w-full overflow-hidden select-none italic"
                                style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: generatingLineClamp,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {item.prompt}
                            </div>
                        )}
                    </div>
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
                        onClick={() => onDelete(item.id)}
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
        if (item.status === 'complete') {
            // Show loading placeholder while image data is being loaded
            if (!isVisible || isLoadingImage || !displayUrl) {
                return (
                    <div
                        className="w-full h-full cursor-pointer relative"
                        onClick={() => navigate(`/image/${item.id}`)}
                    >
                        <MagicalImagePlaceholder className="absolute inset-0" variant="basic" />
                    </div>
                );
            }

            return (
                <>
                    <img
                        src={displayUrl}
                        alt={item.prompt}
                        className={`w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-107 cursor-pointer ${shouldFadeIn ? 'opacity-100' : 'opacity-0'
                            }`}
                        onError={handleImageError}
                        loading="eager"
                        onClick={() => navigate(`/image/${item.id}`)}
                        onLoad={() => {
                            // Ensure fade-in happens when image loads, but only if we haven't already faded in
                            if (isVisible && !shouldFadeIn && !hasFadedInRef.current) {
                                setTimeout(() => {
                                    setShouldFadeIn(true);
                                    hasFadedInRef.current = true;
                                }, 50);
                            }
                        }}
                    />
                    {/* Loading placeholder that shows while fading in */}
                    {!shouldFadeIn && (
                        <div className="absolute inset-0 bg-muted/30"></div>
                    )}
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
            className={`relative rounded-lg overflow-hidden bg-muted w-full h-full ${item.status === 'complete' ? 'group' : ''}`}
            style={{
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={() => item.status === 'complete' && setIsHovered(true)}
            onMouseLeave={() => item.status === 'complete' && setIsHovered(false)}
        >
            {/* Inner border overlay - only for complete images */}
            {item.status === 'complete' && (
                <div
                    className="absolute inset-0 pointer-events-none rounded-lg transition-all duration-200 z-30"
                    style={{
                        boxShadow: isHovered ? 'inset 0 0 0 3px white' : 'inset 0 0 0 0px white'
                    }}
                />
            )}
            {renderContent()}

            {/* Action buttons - shown on hover for complete images */}
            {isHovered && item.status === 'complete' && (
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => {
                            // Detect file extension from image format
                            let extension = 'png'; // default
                            if (item.url?.includes('image/jpeg') || item.url?.includes('data:image/jpeg')) {
                                extension = 'jpg';
                            } else if (item.url?.includes('image/gif') || item.url?.includes('data:image/gif')) {
                                extension = 'gif';
                            } else if (item.url?.includes('image/webp') || item.url?.includes('data:image/webp')) {
                                extension = 'webp';
                            }

                            const baseFilename = `image-${item.id}`;

                            // Download the image using the loaded URL
                            if (displayUrl) {
                                const imageLink = document.createElement('a');
                                imageLink.href = displayUrl;
                                imageLink.download = `${baseFilename}.${extension}`;
                                document.body.appendChild(imageLink);
                                imageLink.click();
                                document.body.removeChild(imageLink);
                            }

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

                                // Clean up the blob URL
                                URL.revokeObjectURL(jsonUrl);
                            }
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
                    className={`absolute bottom-0 left-0 right-0 z-10 bg-linear-to-t from-neutral-800/80 via-black/40 to-transparent p-4 pt-8 transition-opacity duration-200 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    <p className="text-white text-sm leading-relaxed flex items-start gap-2 select-none">
                        <span
                            className="flex-1 overflow-hidden"
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: hoverLineClamp,
                                WebkitBoxOrient: 'vertical',
                                textOverflow: 'ellipsis'
                            }}
                        >{item.prompt}</span>
                        <button
                            onClick={handleCopyPrompt}
                            className="shrink-0 pointer-events-auto hover:bg-white/20 rounded p-1 transition-colors cursor-pointer"
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
    onEdit: (image: GeneratedImage) => Promise<void>
) {
    return (props: MasonryItemRendererProps) => (
        <ImageCard
            {...props}
            item={props.item as ImageMasonryItem}
            onDelete={onDelete}
            onEdit={onEdit}
        />
    );
}