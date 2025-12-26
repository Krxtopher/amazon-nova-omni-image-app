import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GeneratedImage, PromptEnhancement } from '../types';
import type { MasonryItemRendererProps } from './MasonryGrid';
import { Button } from './ui/button';
import { Trash2, Edit2, Download, Copy, Check } from 'lucide-react';
import { MagicalImagePlaceholder } from './MagicalImagePlaceholder';
import { useImageData } from '../hooks/useImageData';
import { useDynamicLineClamp } from '../hooks/useDynamicLineClamp';
import WordRevealContainer from './WordRevealContainer';

interface ImageMasonryItem extends GeneratedImage {
    // MasonryGrid expects id, width, height which GeneratedImage already has
}

interface ImageRendererProps extends MasonryItemRendererProps {
    item: ImageMasonryItem;
    onDelete: (id: string) => void;
    onEdit: (image: GeneratedImage) => Promise<void>;
    enhancementType?: PromptEnhancement;
}

/**
 * Renderer component for displaying GeneratedImage items in MasonryGrid
 * FIXED: Simplified animation logic to prevent invisible images
 * PERFORMANCE FIX: Memoized to prevent unnecessary re-renders when other images update
 * DEV_CACHE_BUST: 1766463500000
 */
export const ImageCard = memo(function ImageCard({
    item,
    displayWidth: _displayWidth,
    displayHeight: _displayHeight,
    isVisible,
    onDelete,
    onEdit,
    enhancementType = 'off'
}: ImageRendererProps) {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Dynamic line clamp for generating state text
    const { containerRef: textContainerRef, lineClamp: textLineClamp } = useDynamicLineClamp({
        lineHeight: 28, // text-lg line height (1.75rem * 16px = 28px)
        minLines: 2,
        maxLines: 20,
        padding: 0 // account for padding, "Generating..." text, and margins
    });

    // Dynamic line clamp for prompt overlay
    const { containerRef: overlayContainerRef, lineClamp: overlayLineClamp } = useDynamicLineClamp({
        lineHeight: 20, // text-sm line height (1.25rem * 16px = 20px)
        minLines: 2,
        maxLines: 12,
        padding: 80 // account for padding and gradient overlay
    });

    // Load image data on demand when visible and status is complete
    const shouldLoadImage = isVisible && item.status === 'complete';
    const { imageUrl, isLoading: isLoadingImage } = useImageData(shouldLoadImage ? item.id : null);

    // Use loaded URL or fallback to item.url for backward compatibility
    const displayUrl = imageUrl || item.url;

    const handleImageError = () => {
        setImageError(true);
    };

    const handleCopyPrompt = async () => {
        // Copy the enhanced prompt if available, otherwise the original prompt
        const promptToCopy = item.enhancedPrompt || item.prompt;
        if (promptToCopy) {
            try {
                await navigator.clipboard.writeText(promptToCopy);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                // Silently handle copy errors
            }
        }
    };

    const renderContent = () => {
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

            // FIXED: Show image immediately without complex fade-in animation
            return (
                <>
                    <img
                        src={displayUrl}
                        alt={item.prompt}
                        className="w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-105 cursor-pointer"
                        onError={handleImageError}
                        loading="eager"
                        onClick={() => navigate(`/image/${item.id}`)}
                    />
                    {/* Vignette overlay - fades in on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle, transparent 30%, rgba(0, 0, 0, 0.1) 80%, rgba(0, 0, 0, 0.2) 100%)'
                        }}
                    />
                </>
            );
        }

        // Show error state
        if (item.status === 'error' || imageError) {
            return (
                <div className="absolute inset-0 flex flex-col bg-destructive/10">
                    <div className="flex justify-between items-start p-3 shrink-0">
                        <div className="text-sm text-destructive font-medium">
                            {item.error || 'Failed to load image'}
                        </div>
                        <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => onDelete(item.id)}
                            className="h-8 w-8 shadow-sm"
                            aria-label="Delete error message"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    {item.prompt && (
                        <div className="flex-1 px-3 pb-3 min-h-0">
                            <div className="h-full bg-muted/30 rounded-md p-3 overflow-y-auto">
                                <div className="text-xs text-muted-foreground mb-2 font-medium">
                                    {item.enhancedPrompt ? 'Enhanced Prompt:' : 'Original Prompt:'}
                                </div>
                                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                    {item.enhancedPrompt || item.prompt}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Show generating/pending states
        return (
            <div className="absolute inset-0">
                <MagicalImagePlaceholder className="absolute inset-0" variant="shader" />
                <div className="absolute inset-0 flex flex-col p-4 z-10 mix-blend-overlay">
                    <div ref={textContainerRef} className="flex-1 min-h-0 overflow-hidden relative">
                        {item.prompt && (
                            <div className="h-full flex items-start justify-start pt-4">
                                <div className="text-white text-left font-medium leading-relaxed max-w-full overflow-hidden select-none">
                                    <div
                                        className="overflow-hidden"
                                        style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: textLineClamp,
                                            WebkitBoxOrient: 'vertical',
                                            lineHeight: '1.75rem' // Ensure consistent line height
                                        }}
                                    >
                                        <WordRevealContainer
                                            words={(enhancementType === 'off' ? item.prompt : item.enhancedPrompt || '').split(' ')}
                                            delayPerCharacterMsec={33}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="text-white text-center shrink-0 mt-2">
                        {item.status === 'generating' ? 'Generating...' : item.status}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            ref={overlayContainerRef}
            className={`relative rounded-lg overflow-hidden w-full h-full bg-linear-to-b from-white/1 to-transparent ${item.status === 'complete' ? 'group' : ''}`}
            style={{
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.3)',
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
                        onClick={async () => {
                            if (displayUrl) {
                                // Download the image
                                const imageLink = document.createElement('a');
                                imageLink.href = displayUrl;
                                imageLink.download = `${item.id}-image.png`;
                                document.body.appendChild(imageLink);
                                imageLink.click();
                                document.body.removeChild(imageLink);

                                // Download image generation parameters if available
                                if (item.converseParams) {
                                    const imageGenParams = JSON.stringify(item.converseParams, null, 2);
                                    const imageGenBlob = new Blob([imageGenParams], { type: 'application/json' });
                                    const imageGenUrl = URL.createObjectURL(imageGenBlob);
                                    const imageGenLink = document.createElement('a');
                                    imageGenLink.href = imageGenUrl;
                                    imageGenLink.download = `${item.id}-image-gen-request.json`;
                                    document.body.appendChild(imageGenLink);
                                    imageGenLink.click();
                                    document.body.removeChild(imageGenLink);
                                    URL.revokeObjectURL(imageGenUrl);
                                }

                                // Download prompt enhancement parameters if available
                                if (item.promptEnhanceParams) {
                                    const promptEnhanceParams = JSON.stringify(item.promptEnhanceParams, null, 2);
                                    const promptEnhanceBlob = new Blob([promptEnhanceParams], { type: 'application/json' });
                                    const promptEnhanceUrl = URL.createObjectURL(promptEnhanceBlob);
                                    const promptEnhanceLink = document.createElement('a');
                                    promptEnhanceLink.href = promptEnhanceUrl;
                                    promptEnhanceLink.download = `${item.id}-prompt-enhance-request.json`;
                                    document.body.appendChild(promptEnhanceLink);
                                    promptEnhanceLink.click();
                                    document.body.removeChild(promptEnhanceLink);
                                    URL.revokeObjectURL(promptEnhanceUrl);
                                }
                            }
                        }}
                        className="h-8 w-8 shadow-lg backdrop-blur-sm"
                        aria-label="Download image and parameters"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 shadow-lg backdrop-blur-sm"
                        aria-label="Edit image"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => onDelete(item.id)}
                        className="h-8 w-8 shadow-lg backdrop-blur-sm"
                        aria-label="Delete image"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Prompt overlay - always present but controlled by opacity */}
            {item.status === 'complete' && item.prompt && (
                <div
                    // ref={overlayContainerRef}
                    className={`absolute bottom-0 left-0 right-0 z-10 bg-linear-to-t from-neutral-800/80 via-black/40 to-transparent p-4 pt-8 transition-opacity duration-200 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                >
                    <p className="text-white text-sm leading-relaxed flex items-start gap-2 select-none">
                        <span
                            className="flex-1 overflow-hidden"
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: overlayLineClamp,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: '1.25rem' // Ensure consistent line height
                            }}
                        >
                            {item.enhancedPrompt || item.prompt}
                        </span>
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
}, (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render if the specific item or relevant props changed
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.status === nextProps.item.status &&
        prevProps.item.url === nextProps.item.url &&
        prevProps.item.error === nextProps.item.error &&
        prevProps.item.prompt === nextProps.item.prompt &&
        prevProps.item.enhancedPrompt === nextProps.item.enhancedPrompt &&
        prevProps.item.converseParams === nextProps.item.converseParams &&
        prevProps.item.promptEnhanceParams === nextProps.item.promptEnhanceParams &&
        prevProps.displayWidth === nextProps.displayWidth &&
        prevProps.displayHeight === nextProps.displayHeight &&
        prevProps.isVisible === nextProps.isVisible &&
        prevProps.enhancementType === nextProps.enhancementType
    );
});

/**
 * Creates a renderer function for use with MasonryGrid
 */
export function createImageRenderer(
    onDelete: (id: string) => void,
    onEdit: (image: GeneratedImage) => Promise<void>,
    enhancementType: PromptEnhancement = 'off'
) {
    return (props: MasonryItemRendererProps) => (
        <ImageCard
            {...props}
            item={props.item as ImageMasonryItem}
            onDelete={onDelete}
            onEdit={onEdit}
            enhancementType={enhancementType}
        />
    );
}