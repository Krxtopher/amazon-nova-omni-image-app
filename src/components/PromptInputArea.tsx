import { useState, useRef, useEffect } from 'react';
import { startTransition } from 'react';
import { PromptInputTextArea } from '@/components/ui/prompt-input-textarea';
import { Button } from '@/components/ui/button';
import { useImageStore } from '@/stores/imageStore';
import { useUIStore, useEditSourceStore } from '@/stores/uiStore';

import { BedrockImageService, ASPECT_RATIO_DIMENSIONS } from '@/services/BedrockImageService';
import { StreamingPromptEnhancementService } from '@/services/StreamingPromptEnhancementService';
import type { AspectRatio, EditSource, GeneratedImage } from '@/types';
import { X, Plus, Send, Dice5 } from 'lucide-react';
import { AspectRatioSelector } from './AspectRatioSelector';
import { PersonaSelector } from './PersonaSelector';
import { PersonaTray } from './PersonaTray';
import { TextResponseModal } from './TextResponseModal';



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
    const [promptEnhancementExpanded, setPromptEnhancementExpanded] = useState(false);
    const [showTextResponseModal, setShowTextResponseModal] = useState(false);
    const [textResponsePrompt, setTextResponsePrompt] = useState('');
    const [textareaExpanded, setTextareaExpanded] = useState(false);
    const [personaRefreshTrigger, setPersonaRefreshTrigger] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputBarRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<any>(null);
    const streamingServiceRef = useRef<StreamingPromptEnhancementService | null>(null);



    const {
        addPlaceholderImage,
        updateImage,
        deleteImage,
    } = useImageStore();

    const {
        selectedAspectRatio,
        selectedPromptEnhancement,
        setAspectRatio,
        setPromptEnhancement,
    } = useUIStore();

    const { editSource, setEditSource, clearEditSource } = useEditSourceStore();

    // Initialize streaming service
    useEffect(() => {
        const initializeStreamingService = async () => {
            try {
                // Get AWS credentials from environment
                const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
                const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID || '';
                const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '';

                if (accessKeyId && secretAccessKey) {
                    streamingServiceRef.current = new StreamingPromptEnhancementService({
                        region,
                        credentials: {
                            accessKeyId,
                            secretAccessKey
                        }
                    });
                }
            } catch (error) {
                console.warn('Failed to initialize streaming service:', error);
            }
        };

        initializeStreamingService();

        return () => {
            // Cleanup streaming service on unmount
            if (streamingServiceRef.current) {
                streamingServiceRef.current.cancelStreaming();
            }
        };
    }, []);



    // Notify parent when activeRequests changes
    useEffect(() => {
        onActiveRequestsChange?.(activeRequests);
    }, [activeRequests, onActiveRequestsChange]);

    // Handle clicking outside to close expanded trays and collapse textarea
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // If clicking completely outside the input bar, close everything
            if (inputBarRef.current && !inputBarRef.current.contains(target)) {
                setAspectRatioExpanded(false);
                setPromptEnhancementExpanded(false);
                setTextareaExpanded(false);
                return;
            }

            // If clicking inside the input bar, check if we should close specific drawers
            if (inputBarRef.current && inputBarRef.current.contains(target)) {
                // Check if click is within the aspect ratio tray content
                const aspectRatioTray = inputBarRef.current.querySelector('[data-aspect-ratio-tray]');
                const isClickInAspectRatioTray = aspectRatioTray && aspectRatioTray.contains(target);

                // Check if click is within the persona tray content  
                const personaTray = inputBarRef.current.querySelector('[data-persona-tray]');
                const isClickInPersonaTray = personaTray && personaTray.contains(target);

                // Check if click is on the selector buttons themselves (should not close)
                const aspectRatioSelector = (target as Element).closest('[aria-label*="Current aspect ratio"]');
                const personaSelector = (target as Element).closest('[aria-label*="Current persona"]');

                // Close aspect ratio drawer if clicking elsewhere in input bar (but not on its selector or tray)
                if (aspectRatioExpanded && !isClickInAspectRatioTray && !aspectRatioSelector) {
                    setAspectRatioExpanded(false);
                }

                // Close persona drawer if clicking elsewhere in input bar (but not on its selector or tray)
                if (promptEnhancementExpanded && !isClickInPersonaTray && !personaSelector) {
                    setPromptEnhancementExpanded(false);
                }

                // Close textarea expansion when clicking elsewhere in input bar (but not on textarea itself)
                const isClickOnTextarea = (target as Element).closest('textarea') || (target as Element).tagName === 'TEXTAREA';
                if (textareaExpanded && !isClickOnTextarea) {
                    setTextareaExpanded(false);
                }
            }
        };

        if (aspectRatioExpanded || promptEnhancementExpanded || textareaExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [aspectRatioExpanded, promptEnhancementExpanded, textareaExpanded]);

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
        // Close all drawers when submitting a new image generation request
        setAspectRatioExpanded(false);
        setPromptEnhancementExpanded(false);

        // Collapse the textarea when submitting via button click
        setTextareaExpanded(false);
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
        const initialStatus = 'generating';
        const placeholderImage: GeneratedImage = {
            id: placeholderId,
            url: '', // Empty URL for placeholder
            prompt: prompt, // Original prompt
            enhancedPrompt: undefined, // Will be set if enhancement is used
            status: initialStatus,
            aspectRatio: aspectRatioToUse,
            width: dimensions.width,
            height: dimensions.height,
            createdAt: new Date(),
        };

        // Add placeholder to gallery immediately (UI-only, no database write)
        addPlaceholderImage(placeholderImage);

        // Track active request
        setActiveRequests(prev => prev + 1);

        // Define the generation function
        const executeGeneration = async () => {
            try {
                // Update status to generating when execution starts
                updateImage(placeholderId, { status: 'generating' });

                // Step 1: Enhance the prompt if persona is enabled
                let enhancedPrompt = prompt;
                if (selectedPromptEnhancement !== 'off' && streamingServiceRef.current) {
                    try {
                        // Use streaming enhancement with promise-based wrapper
                        enhancedPrompt = await new Promise<string>((resolve) => {
                            streamingServiceRef.current!.enhancePromptStreaming(
                                prompt,
                                selectedPromptEnhancement,
                                () => {
                                    // Accumulate tokens but don't update UI here since we're in generation flow
                                },
                                (finalText: string) => {
                                    resolve(finalText);
                                },
                                (error: string) => {
                                    console.warn('Streaming enhancement failed, using original prompt:', error);
                                    resolve(prompt); // Fallback to original prompt
                                }
                            );
                        });

                        // Store the enhanced prompt
                        updateImage(placeholderId, {
                            enhancedPrompt: enhancedPrompt
                        });
                    } catch (error) {
                        enhancedPrompt = prompt;
                    }
                }

                // Step 2: Prepare the final prompt with aspect ratio information for the model
                let finalPrompt = enhancedPrompt;
                if (!currentEditSource) {
                    // Only append aspect ratio for new generation, not for edits
                    finalPrompt = `${enhancedPrompt}(${aspectRatioToUse})`;
                }

                // Call BedrockImageService to generate content
                // Use editSource if present, otherwise generate from scratch
                const response = await bedrockService.generateContent({
                    prompt: finalPrompt,
                    aspectRatio: currentEditSource ? undefined : aspectRatioToUse,
                    editSource: currentEditSource || undefined,
                    promptEnhancement: selectedPromptEnhancement,
                });

                // Handle the response based on type
                if (response.type === 'text') {
                    // Remove placeholder image
                    deleteImage(placeholderId);

                    // Show modal with helpful message and original prompt
                    setTextResponsePrompt(prompt);
                    setShowTextResponseModal(true);

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

            } finally {
                // Decrement active requests
                setActiveRequests(prev => prev - 1);
            }
        };

        // Execute the request immediately
        executeGeneration();
    };

    /**
     * Handle Enter key press in textarea (with Shift+Enter for new line)
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            // Close all drawers when submitting via Enter key
            setAspectRatioExpanded(false);
            setPromptEnhancementExpanded(false);

            handleSubmit();
            // Collapse the textarea after submission
            setTextareaExpanded(false);
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
        <div className="flex w-full flex-row">
            <div className="w-20" />
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
                    className="unified-input-bar bg-[#3C345A]/65 backdrop-blur-md border border-border rounded-2xl transition-all duration-200 max-h-[80vh] overflow-y-auto"
                    style={{
                        boxShadow: '0 12px 65px rgba(0, 0, 0, 0.15)'
                    }}
                >
                    {/* Main layout: Left thumbnail column + Right content column */}
                    <div className="flex items-stretch gap-3 p-2">
                        {/* Left column - Thumbnail (only when image is selected) */}
                        {editSource && (
                            <div className="shrink-0 flex items-start justify-center" style={{ width: '72px' }}>
                                {/* Thumbnail preview (if image uploaded) */}
                                <div className="relative group">
                                    <div className="relative">
                                        <img
                                            src={editSource.url}
                                            alt="Edit source"
                                            className="object-cover rounded border-2 border-primary/50"
                                            style={{ width: '72px', height: '72px' }}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity p-0 bg-white hover:bg-white border border-gray-200"
                                        onClick={handleClearEditSource}
                                        aria-label="Remove edit source"
                                        title="Remove edit source"
                                    >
                                        <X className="h-3 w-3 text-black" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Right column - Text input and aspect ratio selector in column layout */}
                        <div className="flex-1 flex flex-col">
                            {/* Top row - Upload button, text input and send button */}
                            <div className="flex items-start gap-1 mb-2">
                                {/* Upload button - only show when no edit source is selected */}
                                {!editSource && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleUploadClick}
                                        className="shrink-0 h-9 w-9"
                                        aria-label="Upload image to edit"
                                        title="Upload image to edit"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}

                                {/* Text Input */}
                                <PromptInputTextArea
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
                                    onFocus={() => setTextareaExpanded(true)}
                                    onKeyDown={handleKeyDown}
                                    forceExpanded={textareaExpanded}
                                    className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-2 placeholder:text-neutral-200/60 placeholder:italic"
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

                            {/* Bottom row - Aspect ratio and prompt enhancement selectors */}
                            <div className="flex items-center gap-4 px-2 relative justify-start">
                                <div className="flex items-center gap-0">
                                    <span className="text-white/50 special-gothic-label">Dimensions</span>
                                    <AspectRatioSelector
                                        selectedAspectRatio={selectedAspectRatio}
                                        onAspectRatioChange={(ratio) => !editSource && setAspectRatio(ratio)}
                                        disabled={!!editSource}
                                        isExpanded={aspectRatioExpanded}
                                        onExpandedChange={(expanded) => {
                                            setAspectRatioExpanded(expanded);
                                            // Close persona drawer when aspect ratio drawer opens
                                            if (expanded) {
                                                setPromptEnhancementExpanded(false);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-0">
                                    <span className="text-white/50 font-medium special-gothic-label">Persona</span>
                                    <PersonaSelector
                                        selectedPersona={selectedPromptEnhancement}
                                        onPersonaChange={setPromptEnhancement}
                                        isExpanded={promptEnhancementExpanded}
                                        refreshTrigger={personaRefreshTrigger}
                                        onExpandedChange={(expanded) => {
                                            setPromptEnhancementExpanded(expanded);
                                            // Close aspect ratio drawer when persona drawer opens
                                            if (expanded) {
                                                setAspectRatioExpanded(false);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expanded aspect ratio tray - integrated within the input bar */}
                    {aspectRatioExpanded && (
                        <div data-aspect-ratio-tray className="px-2 pb-3 border-t border-border/30 mt-2 max-h-[40vh] overflow-y-auto">
                            <div className="flex flex-wrap items-center justify-center gap-2 py-2">
                                {ASPECT_RATIOS.map((ratio) => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => {
                                            if (!editSource) {
                                                // 🚀 PERFORMANCE FIX: Batch state updates to prevent multiple renders
                                                startTransition(() => {
                                                    setAspectRatio(ratio.value);
                                                    setAspectRatioExpanded(false);
                                                });
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

                    {/* Expanded personas tray - integrated within the input bar */}
                    {promptEnhancementExpanded && (
                        <PersonaTray
                            selectedPersona={selectedPromptEnhancement}
                            onPersonaChange={setPromptEnhancement}
                            onClose={() => setPromptEnhancementExpanded(false)}
                            onPersonaUpdated={() => setPersonaRefreshTrigger(prev => prev + 1)}
                        />
                    )}
                </div>

                {/* Text Response Modal */}
                <TextResponseModal
                    isOpen={showTextResponseModal}
                    onClose={() => setShowTextResponseModal(false)}
                    originalPrompt={textResponsePrompt}
                />

            </div>
        </div>
    );
}
