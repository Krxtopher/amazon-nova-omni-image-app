import { useState, useRef, useEffect } from 'react';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { Button } from '@/components/ui/button';
import { useImageStore } from '@/stores/imageStore';
import { BedrockImageService, ASPECT_RATIO_DIMENSIONS } from '@/services/BedrockImageService';
import type { AspectRatio, EditSource, GeneratedImage, GeneratedText } from '@/types';
import { X, Paperclip, Send, Dice5 } from 'lucide-react';
import { AspectRatioSelector } from './AspectRatioSelector';

/**
 * Props for PromptInputArea component
 */
interface PromptInputAreaProps {
    bedrockService: BedrockImageService;
    onError?: (error: string) => void; // Kept for compatibility, but generation errors now show in placeholders
    onSuccess?: (message: string) => void;
    onActiveRequestsChange?: (count: number) => void;
}



/**
 * Concrete aspect ratios (excluding 'random')
 */
const CONCRETE_ASPECT_RATIOS: Exclude<AspectRatio, 'random'>[] = [
    '2:1', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16', '1:2'
];

/**
 * Available aspect ratio options with their visual representations
 * Dimensions calculated to accurately reflect proportions with a max dimension of 32px
 */
const ASPECT_RATIOS: { value: AspectRatio; label: string; width: number; height: number }[] = [
    { value: 'random', label: 'Any', width: 24, height: 24 },
    { value: '2:1', label: '2:1', width: 32, height: 16 },
    { value: '16:9', label: '16:9', width: 32, height: 18 },
    { value: '3:2', label: '3:2', width: 30, height: 20 },
    { value: '4:3', label: '4:3', width: 28, height: 21 },
    { value: '1:1', label: '1:1', width: 24, height: 24 },
    { value: '3:4', label: '3:4', width: 21, height: 28 },
    { value: '2:3', label: '2:3', width: 20, height: 30 },
    { value: '9:16', label: '9:16', width: 18, height: 32 },
    { value: '1:2', label: '1:2', width: 16, height: 32 },
];

/**
 * Get a random aspect ratio from the available options
 */
const getRandomAspectRatio = (): Exclude<AspectRatio, 'random'> => {
    const randomIndex = Math.floor(Math.random() * CONCRETE_ASPECT_RATIOS.length);
    return CONCRETE_ASPECT_RATIOS[randomIndex];
};

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
export function PromptInputArea({ bedrockService, onError: _onError, onSuccess, onActiveRequestsChange }: PromptInputAreaProps) {
    const [prompt, setPrompt] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [activeRequests, setActiveRequests] = useState(0);
    const [aspectRatioExpanded, setAspectRatioExpanded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputBarRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<any>(null);

    const {
        selectedAspectRatio,
        editSource,
        setAspectRatio,
        setEditSource,
        clearEditSource,
        addImage,
        addTextItem,
        updateImage,
        deleteImage,
    } = useImageStore();

    // Notify parent when activeRequests changes
    useEffect(() => {
        onActiveRequestsChange?.(activeRequests);
    }, [activeRequests, onActiveRequestsChange]);

    // Handle clicking outside to close aspect ratio tray
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (inputBarRef.current && !inputBarRef.current.contains(event.target as Node)) {
                setAspectRatioExpanded(false);
            }
        };

        if (aspectRatioExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [aspectRatioExpanded]);

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
     * 2. Creates placeholder image immediately (optimistic UI)
     * 3. Calls BedrockImageService to generate/edit image
     * 4. Updates store with results or removes placeholder on error/text response
     * 5. Handles errors with notifications
     * 
     * Requirements: 1.1, 1.3, 1.4, 1.5
     */
    const handleSubmit = async () => {
        // Collapse the textarea when submitting via button click
        if (textareaRef.current?.collapseTextarea) {
            textareaRef.current.collapseTextarea();
        }
        // Validate prompt
        if (!validatePrompt(prompt)) {
            return;
        }

        // Store current edit source before clearing
        const currentEditSource = editSource;

        // Determine aspect ratio to use
        let aspectRatioToUse: Exclude<AspectRatio, 'random'>;
        if (currentEditSource) {
            // Use edit source's aspect ratio (edit sources always have concrete ratios)
            aspectRatioToUse = currentEditSource.aspectRatio as Exclude<AspectRatio, 'random'>;
        } else if (selectedAspectRatio === 'random') {
            // Pick a random aspect ratio
            aspectRatioToUse = getRandomAspectRatio();
        } else {
            // Use selected aspect ratio (already validated as concrete)
            aspectRatioToUse = selectedAspectRatio as Exclude<AspectRatio, 'random'>;
        }
        const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatioToUse];

        // Create placeholder image immediately (optimistic UI)
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

        // Add placeholder to gallery immediately
        console.log('Adding placeholder image with status:', placeholderImage.status);
        addImage(placeholderImage);

        // Track active request
        setActiveRequests(prev => prev + 1);

        try {
            // Prepare the prompt with aspect ratio information for the model
            let enhancedPrompt = prompt;
            if (!currentEditSource) {
                // Only append aspect ratio for new generation, not for edits
                enhancedPrompt = `${prompt} (aspect ratio ${aspectRatioToUse})`;
            }

            // Call BedrockImageService to generate content
            // Use editSource if present, otherwise generate from scratch
            const response = await bedrockService.generateContent({
                prompt: enhancedPrompt,
                aspectRatio: currentEditSource ? undefined : aspectRatioToUse,
                editSource: currentEditSource || undefined,
            });

            // Handle the response based on type
            if (response.type === 'text') {
                // Model returned text content - remove placeholder and add text item to gallery
                deleteImage(placeholderId);

                // Create text item for the gallery
                const textItem: GeneratedText = {
                    id: crypto.randomUUID(),
                    content: response.text,
                    prompt: prompt,
                    status: 'complete',
                    createdAt: new Date(),
                    converseParams: response.converseParams,
                };

                addTextItem(textItem);

                // Clear validation error
                setValidationError(null);

                // Note: Keep edit source selected for additional requests
            } else if (response.type === 'error') {
                // Model returned an error (e.g., unexpected stopReason) - update placeholder to show error
                updateImage(placeholderId, {
                    status: 'error',
                    error: response.error,
                    converseParams: response.converseParams,
                });

                // Clear validation error
                setValidationError(null);

                // Note: Keep edit source selected for additional requests
            } else {
                // Model returned an image - check actual aspect ratio and update placeholder
                // Requirements: 1.4
                const actualDimensions = await getImageDimensions(response.imageDataUrl);
                const actualAspectRatio = calculateAspectRatio(actualDimensions.width, actualDimensions.height);

                console.log('Updating image to complete status for:', placeholderId);
                updateImage(placeholderId, {
                    url: response.imageDataUrl,
                    status: 'complete',
                    aspectRatio: actualAspectRatio,
                    width: actualDimensions.width,
                    height: actualDimensions.height,
                    converseParams: response.converseParams,
                });

                // Show success notification
                if (onSuccess) {
                    onSuccess(currentEditSource ? 'Image edited successfully! Image remains selected for more edits.' : 'Image generated successfully!');
                }

                // Clear validation error
                setValidationError(null);

                // Note: Keep edit source selected for additional requests
            }
        } catch (error) {
            // Handle errors - update placeholder to show error instead of removing it
            // Requirements: 1.5
            const errorMessage = error && typeof error === 'object' && 'message' in error
                ? (error as { message: string }).message
                : 'Failed to generate content. Please try again.';

            updateImage(placeholderId, {
                status: 'error',
                error: errorMessage,
            });

            console.error('Content generation error:', error);
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
            // Collapse the textarea after submission
            if (textareaRef.current?.collapseTextarea) {
                textareaRef.current.collapseTextarea();
            }
        }
    };

    /**
     * Get actual dimensions from an image data URL
     * Returns a promise that resolves with the image's actual width and height
     */
    const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });
            };
            img.onerror = () => {
                reject(new Error('Failed to load image for dimension checking'));
            };
            img.src = dataUrl;
        });
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
            { value: '2:1', numeric: 2 / 1 },
            { value: '16:9', numeric: 16 / 9 },
            { value: '3:2', numeric: 3 / 2 },
            { value: '4:3', numeric: 4 / 3 },
            { value: '1:1', numeric: 1 },
            { value: '3:4', numeric: 3 / 4 },
            { value: '2:3', numeric: 2 / 3 },
            { value: '9:16', numeric: 9 / 16 },
            { value: '1:2', numeric: 1 / 2 },
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


            {/* Error Messages */}
            {(validationError || fileError) && (
                <div className="mb-4">
                    {validationError && (
                        <p id="prompt-error" className="text-base text-destructive" role="alert">
                            {validationError}
                        </p>
                    )}
                    {fileError && (
                        <p className="text-base text-destructive" role="alert">
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
            <div
                ref={inputBarRef}
                className="unified-input-bar bg-[#3C345A]/65 backdrop-blur-md border border-border rounded-2xl transition-all duration-200"
                style={{
                    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)'
                }}
            >
                {/* Top row with thumbnail, text input, and send button */}
                <div className="flex items-start gap-2 p-2">
                    {/* Thumbnail preview (if image uploaded) */}
                    {editSource && (
                        <div className="relative shrink-0 group mt-0.5">
                            <div className="relative">
                                <img
                                    src={editSource.url}
                                    alt="Edit source"
                                    className="w-9 h-9 object-cover rounded border-2 border-primary/50"
                                />
                                {/* Selected indicator */}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border border-background flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-background rounded-full"></div>
                                </div>
                            </div>
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
                    <AutoExpandingTextarea
                        ref={textareaRef}
                        id="prompt-input"
                        placeholder={editSource ? "How would you like to edit this image?" : "What do you want to create?"}
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                            if (validationError) {
                                setValidationError(null);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-2 placeholder:text-neutral-200"
                        aria-label="Image generation prompt"
                        aria-invalid={!!validationError}
                        aria-describedby={validationError ? 'prompt-error' : undefined}
                    />

                    {/* Send Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!prompt.trim()}
                        size="icon"
                        className="shrink-0 h-9 w-9 mt-0.5"
                        aria-label="Generate image"
                    >
                        <Send className="h-4 w-4" />
                    </Button>


                </div>

                {/* Bottom row with paper clip icon and aspect ratio selector */}
                <div className="flex items-center gap-2 px-2 pb-2 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUploadClick}
                        className="h-8 w-8"
                        aria-label="Upload image to edit"
                        title="Upload image to edit"
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>

                    <AspectRatioSelector
                        selectedAspectRatio={selectedAspectRatio}
                        onAspectRatioChange={(ratio) => !editSource && setAspectRatio(ratio)}
                        disabled={!!editSource}
                        isExpanded={aspectRatioExpanded}
                        onExpandedChange={setAspectRatioExpanded}
                    />
                </div>

                {/* Expanded aspect ratio tray - integrated within the input bar */}
                {aspectRatioExpanded && (
                    <div className="px-2 pb-3 border-t border-border/30 mt-2">
                        <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
                            {ASPECT_RATIOS.map((ratio) => (
                                <button
                                    key={ratio.value}
                                    onClick={() => {
                                        if (!editSource) {
                                            setAspectRatio(ratio.value);
                                            setAspectRatioExpanded(false);
                                        }
                                    }}
                                    disabled={!!editSource}
                                    className={`flex flex-col items-center gap-2 p-3 min-w-[60px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors ${selectedAspectRatio === ratio.value
                                        ? 'bg-white/10 border border-transparent'
                                        : 'border border-transparent hover:border-border'
                                        } ${editSource ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    aria-label={`Select aspect ratio ${ratio.label}`}
                                >
                                    {/* Visual representation */}
                                    <div className="flex items-center justify-center h-8">
                                        {ratio.value === 'random' ? (
                                            <Dice5 className="h-5 w-5" />
                                        ) : (
                                            <div
                                                className="border-2 border-current rounded-sm bg-current/20"
                                                style={{
                                                    width: `${ratio.width}px`,
                                                    height: `${ratio.height}px`,
                                                    minWidth: '16px',
                                                    minHeight: '16px',
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className="text-xs font-medium whitespace-nowrap">{ratio.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
