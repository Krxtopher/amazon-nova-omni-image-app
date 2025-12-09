import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '../../@/components/ui/dropdown-menu';
import { useImageStore } from '@/stores/imageStore';
import { BedrockImageService, ASPECT_RATIO_DIMENSIONS } from '@/services/BedrockImageService';
import type { AspectRatio, EditSource, GeneratedImage } from '@/types';
import { X, Paperclip, Loader2, Menu, Send } from 'lucide-react';

/**
 * Props for PromptInputArea component
 */
interface PromptInputAreaProps {
    bedrockService: BedrockImageService;
    onError?: (error: string) => void;
    onSuccess?: (message: string) => void;
}

/**
 * Available aspect ratio options
 */
const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
    { value: '1:1', label: '1:1 (Square)' },
    { value: '16:9', label: '16:9 (Landscape)' },
    { value: '9:16', label: '9:16 (Portrait)' },
    { value: '4:3', label: '4:3 (Standard)' },
    { value: '3:4', label: '3:4 (Portrait)' },
    { value: '21:9', label: '21:9 (Ultrawide)' },
];

/**
 * PromptInputArea Component
 * 
 * Provides the interface for users to enter prompts and configure image generation.
 * Includes:
 * - Text input for prompts (Textarea)
 * - Aspect ratio selector (Select)
 * - Submit button (Button)
 * - Image placeholder area for edit source
 * 
 * Requirements: 1.1, 2.1, 9.3
 */
export function PromptInputArea({ bedrockService, onError, onSuccess }: PromptInputAreaProps) {
    const [prompt, setPrompt] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [activeRequests, setActiveRequests] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        selectedAspectRatio,
        editSource,
        setAspectRatio,
        setEditSource,
        clearEditSource,
        addImage,
        updateImage,
    } = useImageStore();

    /**
     * Validate prompt is non-empty and not just whitespace
     * Requirements: 1.2
     */
    const validatePrompt = (value: string): boolean => {
        if (value.trim() === '') {
            setValidationError('Prompt cannot be empty or contain only whitespace');
            return false;
        }
        setValidationError(null);
        return true;
    };

    /**
     * Handle form submission
     * Wires up the complete image generation flow:
     * 1. Validates prompt
     * 2. Creates placeholder image immediately
     * 3. Calls BedrockImageService to generate/edit image
     * 4. Updates store with results
     * 5. Handles errors with notifications
     * 
     * Requirements: 1.1, 1.3, 1.4, 1.5
     */
    const handleSubmit = async () => {
        // Validate prompt
        if (!validatePrompt(prompt)) {
            return;
        }

        // Determine aspect ratio to use
        const aspectRatioToUse = editSource ? editSource.aspectRatio : selectedAspectRatio;
        const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatioToUse];

        // Create placeholder image immediately
        // Requirements: 1.3
        const placeholderId = `placeholder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const placeholderImage: GeneratedImage = {
            id: placeholderId,
            url: '', // Empty URL for placeholder
            prompt: prompt,
            status: 'generating',
            aspectRatio: aspectRatioToUse,
            width: dimensions.width,
            height: dimensions.height,
            createdAt: new Date(),
        };

        // Track active request
        setActiveRequests(prev => prev + 1);

        // Store current edit source before clearing
        const currentEditSource = editSource;

        try {
            // Add placeholder to gallery
            await addImage(placeholderImage);

            // Call BedrockImageService to generate image
            // Use editSource if present, otherwise generate from scratch
            const generatedImageUrl = await bedrockService.generateImage({
                prompt: prompt,
                aspectRatio: currentEditSource ? undefined : selectedAspectRatio,
                editSource: currentEditSource || undefined,
            });

            // Update placeholder with generated image
            // Requirements: 1.4
            await updateImage(placeholderId, {
                url: generatedImageUrl,
                status: 'complete',
            });

            // Show success notification
            if (onSuccess) {
                onSuccess(currentEditSource ? 'Image edited successfully!' : 'Image generated successfully!');
            }

            // Clear validation error
            setValidationError(null);

            // Clear edit source if it was used
            if (currentEditSource) {
                handleClearEditSource();
            }
        } catch (error) {
            // Handle errors
            // Requirements: 1.5
            const errorMessage = error && typeof error === 'object' && 'message' in error
                ? (error as { message: string }).message
                : 'Failed to generate image. Please try again.';

            // Update placeholder with error status
            await updateImage(placeholderId, {
                status: 'error',
                error: errorMessage,
            });

            // Show error notification
            if (onError) {
                onError(errorMessage);
            }

            console.error('Image generation error:', error);
        } finally {
            // Decrement active requests
            setActiveRequests(prev => prev - 1);
        }
    };

    /**
     * Handle Enter key press in textarea (with Shift+Enter for new line)
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    /**
     * Calculate aspect ratio from image dimensions
     * Requirements: 6.5
     */
    const calculateAspectRatio = (width: number, height: number): AspectRatio => {
        const ratio = width / height;
        const tolerance = 0.02; // Allow 2% tolerance for aspect ratio matching

        // Check against known aspect ratios
        const ratios: { value: AspectRatio; numeric: number }[] = [
            { value: '1:1', numeric: 1 },
            { value: '16:9', numeric: 16 / 9 },
            { value: '9:16', numeric: 9 / 16 },
            { value: '4:3', numeric: 4 / 3 },
            { value: '3:4', numeric: 3 / 4 },
            { value: '21:9', numeric: 21 / 9 },
        ];

        for (const r of ratios) {
            if (Math.abs(ratio - r.numeric) <= tolerance) {
                return r.value;
            }
        }

        // Default to closest match
        const closest = ratios.reduce((prev, curr) => {
            return Math.abs(curr.numeric - ratio) < Math.abs(prev.numeric - ratio) ? curr : prev;
        });

        return closest.value;
    };

    /**
     * Validate uploaded file type
     * Requirements: 6.2
     */
    const validateFileType = (file: File): boolean => {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setFileError('Invalid file type. Only PNG and JPEG images are supported.');
            return false;
        }
        setFileError(null);
        return true;
    };

    /**
     * Handle file upload
     * Requirements: 6.1, 6.2, 6.5
     */
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!validateFileType(file)) {
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        try {
            // Create object URL for preview
            const url = URL.createObjectURL(file);

            // Load image to extract dimensions
            const img = new Image();
            img.onload = () => {
                const width = img.width;
                const height = img.height;
                const aspectRatio = calculateAspectRatio(width, height);

                // Create edit source
                const editSourceData: EditSource = {
                    url,
                    aspectRatio,
                    width,
                    height,
                };

                // Set edit source in store
                setEditSource(editSourceData);
                setFileError(null);
            };

            img.onerror = () => {
                setFileError('Failed to load image. Please try another file.');
                URL.revokeObjectURL(url);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            };

            img.src = url;
        } catch (error) {
            setFileError('Failed to process image file.');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    /**
     * Trigger file input click
     */
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    /**
     * Handle clearing edit source
     * Cleans up object URLs to prevent memory leaks
     * Requirements: 7.1, 7.2, 7.3
     */
    const handleClearEditSource = () => {
        // Revoke object URL if it was created from a file upload
        if (editSource?.url && editSource.url.startsWith('blob:')) {
            URL.revokeObjectURL(editSource.url);
        }

        // Clear the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Clear edit source in store
        clearEditSource();
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-6 py-4">
            {/* Loading Indicator */}
            {activeRequests > 0 && (
                <div className="mb-4 bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3" role="status" aria-live="polite">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                    <p className="text-sm text-primary">
                        Generating {activeRequests} {activeRequests === 1 ? 'image' : 'images'}...
                    </p>
                </div>
            )}

            {/* Error Messages */}
            {(validationError || fileError) && (
                <div className="mb-4">
                    {validationError && (
                        <p id="prompt-error" className="text-sm text-destructive" role="alert">
                            {validationError}
                        </p>
                    )}
                    {fileError && (
                        <p className="text-sm text-destructive" role="alert">
                            {fileError}
                        </p>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="File upload input"
            />

            {/* Unified Compact Input Bar */}
            <div className="unified-input-bar bg-black/40 backdrop-blur-md border border-border rounded-lg flex items-center gap-2 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                {/* Menu Button with Options */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-9 w-9"
                            aria-label="Options menu"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleUploadClick}>
                            <Paperclip className="h-4 w-4 mr-2" />
                            Upload Image to Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Aspect Ratio
                        </DropdownMenuLabel>
                        {ASPECT_RATIOS.map((ratio) => (
                            <DropdownMenuItem
                                key={ratio.value}
                                onClick={() => !editSource && setAspectRatio(ratio.value as AspectRatio).catch(console.error)}
                                disabled={!!editSource}
                                className={selectedAspectRatio === ratio.value ? 'bg-accent' : ''}
                            >
                                {ratio.label}
                                {selectedAspectRatio === ratio.value && ' ✓'}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Thumbnail preview (if image uploaded) */}
                {editSource && (
                    <div className="relative shrink-0 group">
                        <img
                            src={editSource.url}
                            alt="Edit source"
                            className="w-9 h-9 object-cover rounded border border-border"
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity p-0"
                            onClick={handleClearEditSource}
                            aria-label="Remove edit source"
                            title="Remove edit source"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                {/* Text Input */}
                <Textarea
                    id="prompt-input"
                    placeholder="Describe the image you want to generate..."
                    value={prompt}
                    onChange={(e) => {
                        setPrompt(e.target.value);
                        if (validationError) {
                            setValidationError(null);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-2 [text-shadow:_0_1px_2px_rgb(0_0_0_/_0.3),_0_-1px_2px_rgb(255_255_255_/_0.3)]"
                    aria-label="Image generation prompt"
                    aria-invalid={!!validationError}
                    aria-describedby={validationError ? 'prompt-error' : undefined}
                />

                {/* Send Button */}
                <Button
                    onClick={handleSubmit}
                    disabled={!prompt.trim()}
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    aria-label="Generate image"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
