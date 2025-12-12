import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Download, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { useImageStore } from '../stores/imageStore';

/**
 * Lightbox component for displaying images in fullscreen with details
 * Controlled through URL routing for bookmarking and sharing
 */
export function Lightbox() {
    const { imageId } = useParams<{ imageId: string }>();
    const navigate = useNavigate();
    const { images } = useImageStore();
    const [isCopied, setIsCopied] = useState(false);

    // Find the image by ID
    const image = images.find((img) => img.id === imageId);

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
                console.error('Failed to copy prompt:', err);
            }
        }
    };

    const handleDownload = () => {
        if (!image?.url) return;

        // Detect file extension from image format
        let extension = 'png'; // default
        if (image.url.includes('image/jpeg') || image.url.includes('data:image/jpeg')) {
            extension = 'jpg';
        } else if (image.url.includes('image/gif') || image.url.includes('data:image/gif')) {
            extension = 'gif';
        } else if (image.url.includes('image/webp') || image.url.includes('data:image/webp')) {
            extension = 'webp';
        }

        const baseFilename = `image-${image.id}`;

        // Download the image
        const imageLink = document.createElement('a');
        imageLink.href = image.url;
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
        <div className="fixed inset-0 bg-black/95 z-50 flex">
            {/* Close button */}
            <Button
                onClick={handleClose}
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 z-10 text-white hover:bg-white/20"
                aria-label="Close lightbox"
            >
                <X className="h-6 w-6" />
            </Button>

            {/* Image counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {currentIndex + 1} of {images.length}
            </div>

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
                    className="absolute right-80 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    aria-label="Next image"
                >
                    <ChevronRight className="h-8 w-8" />
                </Button>
            )}

            {/* Image container */}
            <div
                className="flex-1 flex items-center justify-center p-4 pr-80"
                onClick={handleClose}
            >
                <div className="relative max-w-full max-h-full">
                    <img
                        src={image.url}
                        alt={image.prompt}
                        className="max-w-full max-h-full object-contain"
                        style={{
                            maxHeight: 'calc(100vh - 2rem)',
                            maxWidth: 'calc(100vw - 22rem)', // Account for sidebar width
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
                    />
                </div>
            </div>

            {/* Details sidebar */}
            <div className="w-80 bg-black/50 backdrop-blur-sm border-l border-white/10 p-6 overflow-y-auto">
                <div className="space-y-6">
                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleDownload}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-white border-white/20 hover:bg-white/10"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            onClick={handleCopyPrompt}
                            variant="outline"
                            size="sm"
                            className="text-white border-white/20 hover:bg-white/10"
                            aria-label="Copy prompt"
                        >
                            {isCopied ? (
                                <Check className="h-4 w-4 text-green-400" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Image details */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-white font-medium mb-2">Prompt</h3>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {image.prompt}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-white font-medium mb-2">Details</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Aspect Ratio:</span>
                                    <span className="text-gray-300">{image.aspectRatio}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Dimensions:</span>
                                    <span className="text-gray-300">{image.width} × {image.height}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Created:</span>
                                    <span className="text-gray-300">
                                        {new Date(image.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <span className="text-gray-300 capitalize">{image.status}</span>
                                </div>
                            </div>
                        </div>

                        {/* Technical details */}
                        {image.converseParams && (
                            <div>
                                <h3 className="text-white font-medium mb-2">Technical Info</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Model:</span>
                                        <span className="text-gray-300 text-xs">
                                            {image.converseParams.modelId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}