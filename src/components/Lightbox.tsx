import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Download, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { useImageStore } from '../stores/imageStore';
import { useImageData } from '../hooks/useImageData';

/**
 * Lightbox component for displaying images in fullscreen with details
 * Controlled through URL routing for bookmarking and sharing
 */
export function Lightbox() {
    const { imageId } = useParams<{ imageId: string }>();
    const navigate = useNavigate();
    const { images } = useImageStore();
    const [isCopied, setIsCopied] = useState(false);
    const [shouldFadeIn, setShouldFadeIn] = useState(false);

    // Find the image by ID
    const image = images.find((img) => img.id === imageId);

    // Load image data for the current image
    const { imageUrl, isLoading: isLoadingImage } = useImageData(imageId || '');

    // Use loaded URL or fallback to item.url for backward compatibility
    const displayUrl = imageUrl || image?.url;

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                navigate('/');
            } else if (event.key === 'ArrowLeft') {
                // Navigate to previous image
                const currentIndex = images.findIndex(img => img.id === imageId);
                if (currentIndex > 0) {
                    const prevImage = images[currentIndex - 1];
                    navigate(`/image/${prevImage.id}`);
                }
            } else if (event.key === 'ArrowRight') {
                // Navigate to next image
                const currentIndex = images.findIndex(img => img.id === imageId);
                if (currentIndex < images.length - 1) {
                    const nextImage = images[currentIndex + 1];
                    navigate(`/image/${nextImage.id}`);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [navigate, images, imageId]);

    // Prevent body scroll when lightbox is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleClose = () => {
        navigate('/');
    };

    const handleCopyPrompt = async () => {
        if (image?.prompt) {
            try {
                await navigator.clipboard.writeText(image.prompt);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                // Silently handle copy errors
            }
        }
    };

    // Reset fade-in state when imageId changes (navigation)
    useEffect(() => {
        setShouldFadeIn(false);
    }, [imageId]);

    // Trigger fade-in when image loads
    useEffect(() => {
        if (displayUrl && !isLoadingImage) {
            // Longer delay to ensure the opacity-0 class is applied first and visible
            const timer = setTimeout(() => setShouldFadeIn(true), 200);
            return () => clearTimeout(timer);
        }
    }, [displayUrl, isLoadingImage]);

    const handleDownload = () => {
        if (!displayUrl || !image) return;

        // Detect file extension from image format
        let extension = 'png'; // default
        if (displayUrl.includes('image/jpeg') || displayUrl.includes('data:image/jpeg')) {
            extension = 'jpg';
        } else if (displayUrl.includes('image/gif') || displayUrl.includes('data:image/gif')) {
            extension = 'gif';
        } else if (displayUrl.includes('image/webp') || displayUrl.includes('data:image/webp')) {
            extension = 'webp';
        }

        const baseFilename = `image-${image.id}`;

        // Download the image
        const imageLink = document.createElement('a');
        imageLink.href = displayUrl;
        imageLink.download = `${baseFilename}.${extension}`;
        document.body.appendChild(imageLink);
        imageLink.click();
        document.body.removeChild(imageLink);

        // Download the JSON file with Converse API parameters if available
        if (image.converseParams) {
            const jsonData = JSON.stringify(image.converseParams, null, 2);
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
    };

    // If image not found, show error and redirect
    if (!image) {
        return (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div className="text-center text-white">
                    <p className="text-xl mb-4">Image not found</p>
                    <Button onClick={handleClose} variant="outline">
                        Return to Gallery
                    </Button>
                </div>
            </div>
        );
    }



    // Get current image index for navigation
    const currentIndex = images.findIndex(img => img.id === imageId);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < images.length - 1;

    const handlePrevious = () => {
        if (hasPrevious) {
            const prevImage = images[currentIndex - 1];
            navigate(`/image/${prevImage.id}`);
        }
    };

    const handleNext = () => {
        if (hasNext) {
            const nextImage = images[currentIndex + 1];
            navigate(`/image/${nextImage.id}`);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            onClick={handleClose}
        >
            {/* Blurred background image */}
            <div className="absolute inset-0">
                <img
                    key={`bg-${imageId}`} // Force re-render when imageId changes
                    src={displayUrl}
                    alt={image.prompt}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Blur and tint overlay */}
                <div
                    className="absolute inset-0 backdrop-blur-[100px] brightness-75 bg-neutral-900/30"
                />
            </div>

            {/* Close button */}
            <div className="absolute top-0 right-0 w-full flex justify-end pointer-events-none z-20">
                <Button
                    onClick={handleClose}
                    variant="ghost"
                    size="icon"
                    className="m-4 sm:m-10 text-black bg-white/70 backdrop-blur-sm hover:bg-white/80 pointer-events-auto"
                    aria-label="Close lightbox"
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Image counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {currentIndex + 1} of {images.length}
            </div>

            {/* Main window area */}
            <div
                className="absolute inset-2 sm:inset-8 flex flex-col sm:flex-row rounded-lg overflow-hidden sm:overflow-visible"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Navigation arrows */}
                {hasPrevious && (
                    <Button
                        onClick={handlePrevious}
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </Button>
                )}

                {hasNext && (
                    <Button
                        onClick={handleNext}
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 sm:right-80 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                        aria-label="Next image"
                    >
                        <ChevronRight className="h-8 w-8" />
                    </Button>
                )}

                {/* Image container */}
                <div className="flex-1 bg-gray-100/60 backdrop-blur-sm p-0 sm:p-3">
                    <div className="w-full h-full flex items-center justify-center">
                        {displayUrl && !isLoadingImage ? (
                            <img
                                key={imageId} // Force re-render when imageId changes
                                src={displayUrl}
                                alt={image.prompt}
                                className={`max-w-full max-h-full object-contain transition-all duration-1000 ease-out ${shouldFadeIn ? 'opacity-100' : 'opacity-0'}`}
                                onClick={(e) => e.stopPropagation()}
                                onLoad={() => {
                                    if (!shouldFadeIn) {
                                        setTimeout(() => setShouldFadeIn(true), 50);
                                    }
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center bg-black/20 backdrop-blur-sm min-w-96 min-h-96">
                                <div className="text-white/70 text-sm animate-pulse">Loading image...</div>
                            </div>
                        )}
                        {/* Loading placeholder that shows while fading in */}
                        {displayUrl && !shouldFadeIn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                                <div className="text-white/70 text-sm animate-pulse">Loading image...</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details sidebar */}
                <div className="w-full sm:w-80 min-w-60 bg-background text-foreground flex flex-col overflow-hidden">
                    {/* Top spacing area (to account for close button) */}
                    <div className="h-4 sm:h-10 shrink-0"></div>

                    {/* Scrollable content area */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        {/* Creation date */}
                        <p className="text-muted-foreground text-sm italic font-light mb-4">
                            {new Date(image.createdAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>

                        {/* Prompt section */}
                        <div className="space-y-2 mb-6">
                            <h3 className="text-sm font-semibold text-foreground">Prompt:</h3>
                            <p className="text-sm leading-relaxed text-foreground">
                                {image.prompt}
                            </p>
                        </div>

                        {/* Attribute badges */}
                        <div className="flex flex-row sm:flex-col flex-wrap gap-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs">
                                <span className="text-muted-foreground">aspect ratio</span>
                                <span className="font-medium text-foreground">{image.aspectRatio}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs">
                                <span className="text-muted-foreground">size</span>
                                <span className="font-medium text-foreground">{image.width} × {image.height}</span>
                            </div>
                        </div>
                    </div>

                    {/* Fixed action buttons at bottom */}
                    <div className="shrink-0 p-4 pt-2 border-t border-border">
                        <div className="flex justify-center gap-1">
                            <Button
                                onClick={handleDownload}
                                variant="default"
                                size="sm"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                            <Button
                                onClick={handleCopyPrompt}
                                variant="default"
                                size="sm"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                aria-label="Copy prompt"
                            >
                                {isCopied ? (
                                    <Check className="h-4 w-4 text-green-400" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}