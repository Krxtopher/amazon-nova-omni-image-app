import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { ConverseCommandOutput } from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { AspectRatio, GenerationRequest, GenerationResponse, AppError, ConverseRequestParams, PromptEnhancement } from '../types';
import { sqliteService } from './sqliteService';

/**
 * Configuration for BedrockImageService
 */
export interface BedrockServiceConfig {
    region: string;
    credentials: AwsCredentialIdentity;
    systemPrompt?: string;
}

/**
 * Mapping of aspect ratios to their corresponding dimensions
 * Used for display purposes and placeholder sizing
 * Note: 'random' is not included as it's resolved to a concrete ratio before use
 */
export const ASPECT_RATIO_DIMENSIONS: Record<Exclude<AspectRatio, 'random'>, { width: number; height: number }> = {
    '2:1': { width: 1536, height: 768 },
    '16:9': { width: 1344, height: 768 },
    '3:2': { width: 1152, height: 768 },
    '4:3': { width: 1152, height: 896 },
    '1:1': { width: 1024, height: 1024 },
    '3:4': { width: 896, height: 1152 },
    '2:3': { width: 768, height: 1152 },
    '9:16': { width: 768, height: 1344 },
    '1:2': { width: 768, height: 1536 },
};

/**
 * System prompts for different prompt enhancement modes
 */
const PROMPT_ENHANCEMENT_SYSTEM_PROMPTS: Record<Exclude<PromptEnhancement, 'off' | 'custom'>, string> = {
    standard: `You are a prompt enhancement assistant. Your task is to take a user's image generation prompt and enhance it to produce better, more detailed results while preserving the user's original intent.

Guidelines for enhancement:
- Keep the core subject and concept intact
- Add relevant artistic and technical details
- Include appropriate style descriptors
- Enhance lighting, composition, and quality terms
- Add professional photography or art terminology when appropriate
- Maintain the original tone and mood
- Don't change the fundamental meaning or subject

Return only the enhanced prompt, nothing else.`,

    creative: `You are a creative prompt enhancement assistant. Your task is to take a user's image generation prompt and enhance it with artistic flair and creative details while preserving the original concept.

Guidelines for creative enhancement:
- Keep the original subject and intent
- Add imaginative and artistic elements
- Include creative lighting, atmosphere, and mood descriptors
- Enhance with artistic styles, techniques, and mediums
- Add cinematic or dramatic elements when appropriate
- Include color palettes and artistic composition terms
- Make it more visually striking and creative
- Don't fundamentally alter the core concept

Return only the enhanced prompt, nothing else.`
};

/**
 * Service class for interacting with Amazon Bedrock's Nova 2 Omni model
 * via the Converse API for image generation and editing.
 */
export class BedrockImageService {
    private client: BedrockRuntimeClient;
    private readonly modelId = 'us.amazon.nova-2-omni-v1:0';
    private readonly systemPrompt?: string;

    /**
     * Creates a new BedrockImageService instance
     * @param config - Configuration object containing AWS region, credentials, and optional system prompt
     */
    constructor(config: BedrockServiceConfig) {
        this.client = new BedrockRuntimeClient({
            region: config.region,
            credentials: config.credentials,
        });
        this.systemPrompt = config.systemPrompt;
    }

    /**
     * Gets the model ID being used for image generation
     * @returns The Nova 2 Omni model ID
     */
    getModelId(): string {
        return this.modelId;
    }

    /**
     * Gets the configured AWS region
     * @returns The AWS region string
     */
    async getRegion(): Promise<string> {
        const region = await this.client.config.region();
        return region;
    }

    /**
     * Converts an aspect ratio to its corresponding dimensions
     * Note: Nova 2 Omni handles aspect ratios internally via prompt,
     * but these dimensions are useful for display purposes and placeholder sizing
     * 
     * @param ratio - The aspect ratio to convert (must be a concrete ratio, not 'random')
     * @returns Object containing width and height in pixels
     */
    getDimensionsForAspectRatio(ratio: Exclude<AspectRatio, 'random'>): { width: number; height: number } {
        return ASPECT_RATIO_DIMENSIONS[ratio];
    }

    /**
     * Encodes an image to Uint8Array for use with the Converse API
     * Handles multiple input types:
     * - File/Blob objects (from file uploads)
     * - Data URLs (base64 encoded images from gallery)
     * - Blob URLs (object URLs from gallery)
     * 
     * @param imageSource - The image source to encode (File, Blob, data URL, or blob URL)
     * @returns Promise resolving to Uint8Array of image bytes
     * @throws Error if encoding fails or image format is unsupported
     */
    async encodeImageToBytes(imageSource: File | Blob | string): Promise<Uint8Array> {
        try {
            // Handle File or Blob objects directly
            if (imageSource instanceof File || imageSource instanceof Blob) {
                return await this.blobToUint8Array(imageSource);
            }

            // Handle string inputs (data URLs or blob URLs)
            if (typeof imageSource === 'string') {
                // Handle data URLs (base64 encoded images)
                if (imageSource.startsWith('data:')) {
                    return this.dataUrlToUint8Array(imageSource);
                }

                // Handle blob URLs (object URLs)
                if (imageSource.startsWith('blob:')) {
                    const blob = await this.fetchBlobFromUrl(imageSource);
                    return await this.blobToUint8Array(blob);
                }

                // If it's a regular URL, fetch it
                const blob = await this.fetchBlobFromUrl(imageSource);
                return await this.blobToUint8Array(blob);
            }

            throw new Error('Unsupported image source type');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to encode image: ${errorMessage}`);
        }
    }

    /**
     * Converts a Blob to Uint8Array
     * @param blob - The Blob to convert
     * @returns Promise resolving to Uint8Array
     */
    private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
        const arrayBuffer = await blob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }

    /**
     * Converts a data URL to Uint8Array
     * @param dataUrl - The data URL to convert (e.g., "data:image/png;base64,...")
     * @returns Uint8Array of the decoded image data
     * @throws Error if the data URL format is invalid
     */
    private dataUrlToUint8Array(dataUrl: string): Uint8Array {
        // Extract the base64 data from the data URL
        const base64Match = dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);

        if (!base64Match || !base64Match[1]) {
            throw new Error('Invalid data URL format');
        }

        const base64Data = base64Match[1];

        // Decode base64 to binary string
        const binaryString = atob(base64Data);

        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes;
    }

    /**
     * Fetches a Blob from a URL (blob URL or regular URL)
     * @param url - The URL to fetch
     * @returns Promise resolving to Blob
     * @throws Error if fetch fails
     */
    private async fetchBlobFromUrl(url: string): Promise<Blob> {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
        }

        return await response.blob();
    }

    /**
     * Detects the image format from URL or by examining the image bytes
     * @param imageSource - The image source (File, Blob, data URL, or blob URL)
     * @param imageBytes - The image bytes to examine if URL detection fails
     * @returns Promise resolving to the detected format
     */
    private async detectImageFormat(imageSource: File | Blob | string, imageBytes: Uint8Array): Promise<'png' | 'jpeg' | 'gif' | 'webp'> {
        // First try to detect from the source if it's a File or has MIME type info
        if (imageSource instanceof File) {
            if (imageSource.type === 'image/jpeg') return 'jpeg';
            if (imageSource.type === 'image/png') return 'png';
            if (imageSource.type === 'image/gif') return 'gif';
            if (imageSource.type === 'image/webp') return 'webp';
        }

        // Try to detect from data URL
        if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
            if (imageSource.includes('image/jpeg')) return 'jpeg';
            if (imageSource.includes('image/png')) return 'png';
            if (imageSource.includes('image/gif')) return 'gif';
            if (imageSource.includes('image/webp')) return 'webp';
        }

        // Try to detect from blob URL by fetching and checking MIME type
        if (typeof imageSource === 'string' && imageSource.startsWith('blob:')) {
            try {
                const response = await fetch(imageSource);
                const contentType = response.headers.get('content-type');
                if (contentType === 'image/jpeg') return 'jpeg';
                if (contentType === 'image/png') return 'png';
                if (contentType === 'image/gif') return 'gif';
                if (contentType === 'image/webp') return 'webp';
            } catch (error) {
                // Fall through to byte detection
            }
        }

        // Fall back to detecting from file signature (magic bytes)
        return this.detectFormatFromBytes(imageBytes);
    }

    /**
     * Detects image format by examining the file signature (magic bytes)
     * @param bytes - The image bytes to examine
     * @returns The detected format, defaults to 'png' if unable to detect
     */
    private detectFormatFromBytes(bytes: Uint8Array): 'png' | 'jpeg' | 'gif' | 'webp' {
        // Check for PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.length >= 8 &&
            bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
            bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
            return 'png';
        }

        // Check for JPEG signature: FF D8 FF
        if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'jpeg';
        }

        // Check for GIF signature: 47 49 46 38 (GIF8)
        if (bytes.length >= 4 &&
            bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
            return 'gif';
        }

        // Check for WebP signature: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
        if (bytes.length >= 12 &&
            bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
            return 'webp';
        }

        // Default to PNG if unable to detect
        return 'png';
    }

    /**
     * Enhances a user prompt using Nova 2 Omni based on the enhancement type
     * 
     * @param originalPrompt - The original user prompt
     * @param enhancementType - The type of enhancement to apply
     * @returns Promise resolving to the enhanced prompt
     * @throws Error if enhancement fails
     */
    async enhancePrompt(originalPrompt: string, enhancementType: PromptEnhancement): Promise<string> {
        // Return original prompt if enhancement is off
        if (enhancementType === 'off') {
            return originalPrompt;
        }

        try {
            let systemPrompt: string;

            // Handle custom enhancement by loading user-defined persona
            if (enhancementType === 'custom') {
                const customPersona = await sqliteService.getSetting('customPromptEnhancementPersona');
                if (!customPersona) {
                    // If no custom persona is set, fall back to original prompt
                    console.warn('Custom prompt enhancement selected but no custom persona found');
                    return originalPrompt;
                }
                systemPrompt = customPersona as string;
            } else {
                // Use predefined system prompt for standard/creative modes
                systemPrompt = PROMPT_ENHANCEMENT_SYSTEM_PROMPTS[enhancementType];
            }

            const commandParams: any = {
                modelId: this.modelId,
                messages: [
                    {
                        role: 'user',
                        content: [{ text: originalPrompt }],
                    },
                ],
                system: [
                    {
                        text: systemPrompt
                    }
                ],
                inferenceConfig: {
                    temperature: 1.0
                }
            };

            const command = new ConverseCommand(commandParams);
            const response = await this.client.send(command);

            // Extract the enhanced prompt from the response
            if (!response.output?.message?.content) {
                throw new Error('Invalid response structure: missing content');
            }

            const textContent = response.output.message.content.find(
                (item) => item.text !== undefined
            );

            if (!textContent?.text) {
                throw new Error('No text content found in enhancement response');
            }

            return textContent.text.trim();
        } catch (error) {
            console.error('Prompt enhancement failed:', error);
            // Fall back to original prompt if enhancement fails
            return originalPrompt;
        }
    }

    /**
     * Generates content using Amazon Bedrock's Nova 2 Omni model via the Converse API
     * Supports both text-to-image generation and image editing scenarios
     * The model may return either an image or text content
     * 
     * @param request - Generation request containing prompt, aspect ratio, and optional edit source
     * @returns Promise resolving to either an image data URL or text content
     * @throws AppError with categorized error information for various failure scenarios
     */
    async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
        try {
            // Build the message content array
            // Using any[] to work with AWS SDK's complex ContentBlock union types
            const messageContent: any[] = [];
            let sourceImageBase64: string | undefined;

            // If there's an edit source, include the input image
            if (request.editSource) {
                const imageBytes = await this.encodeImageToBytes(request.editSource.url);

                // Determine image format from the URL or file type
                const format = await this.detectImageFormat(request.editSource.url, imageBytes);

                // Convert to base64 for storage in converseParams
                sourceImageBase64 = this.uint8ArrayToBase64(imageBytes);

                messageContent.push({
                    image: {
                        format,
                        source: {
                            bytes: imageBytes,
                        },
                    },
                });
            }

            // Add the text prompt
            messageContent.push({ text: request.prompt });

            // Build the Converse API command
            const commandParams: any = {
                modelId: this.modelId,
                messages: [
                    {
                        role: 'user',
                        content: messageContent,
                    },
                ],
            };

            // Add system prompt if configured
            if (this.systemPrompt) {
                commandParams.system = [
                    {
                        text: this.systemPrompt
                    }
                ];
            }

            const command = new ConverseCommand(commandParams);

            // Create the converseParams for storage (without the actual bytes, but with base64)
            const converseParams: ConverseRequestParams = {
                modelId: this.modelId,
                messages: [
                    {
                        role: 'user',
                        content: messageContent.map(item => {
                            if (item.image) {
                                return {
                                    image: {
                                        format: item.image.format,
                                        source: {
                                            _base64: sourceImageBase64
                                        }
                                    }
                                };
                            }
                            return item;
                        }),
                    },
                ],
            };

            // Call the Bedrock API
            const response = await this.client.send(command);

            // Parse and return the generated image
            return this.parseConverseResponse(response, converseParams);
        } catch (error) {
            // Handle and categorize errors
            throw this.handleError(error);
        }
    }

    /**
     * Parses the Converse API response to extract either image or text content
     * 
     * @param response - The ConverseCommand output from Bedrock
     * @param converseParams - The original request parameters to include in the response
     * @returns GenerationResponse with either image data URL or text content
     * @throws Error if response format is invalid or no content is found
     */
    private parseConverseResponse(response: ConverseCommandOutput, converseParams: ConverseRequestParams): GenerationResponse {
        try {
            // Check for unexpected stopReason values
            if (response.stopReason && response.stopReason !== 'end_turn') {
                return {
                    type: 'error',
                    error: `Unexpected stop reason: ${response.stopReason}`,
                    converseParams,
                };
            }

            // Validate response structure
            if (!response.output?.message?.content) {
                throw new Error('Invalid response structure: missing content');
            }

            // Check if the response contains text
            const textContent = response.output.message.content.find(
                (item) => item.text !== undefined
            );

            if (textContent?.text) {
                // Model returned text content
                return {
                    type: 'text',
                    text: textContent.text,
                    converseParams,
                };
            }

            // Find the image in the response content
            const imageContent = response.output.message.content.find(
                (item) => item.image !== undefined
            );

            if (!imageContent?.image?.source?.bytes) {
                throw new Error('No image or text content found in response');
            }

            // Extract image bytes
            const imageBytes = imageContent.image.source.bytes;
            const format = imageContent.image.format || 'png';

            // Convert Uint8Array to base64
            const base64 = this.uint8ArrayToBase64(imageBytes);

            // Return as image data URL
            return {
                type: 'image',
                imageDataUrl: `data:image/${format};base64,${base64}`,
                converseParams,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
            throw new Error(`Failed to parse response: ${errorMessage}`);
        }
    }

    /**
     * Converts a Uint8Array to a base64 string
     * @param bytes - The Uint8Array to convert
     * @returns Base64 encoded string
     */
    private uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Handles and categorizes errors from the image generation process
     * Provides user-friendly error messages and determines if errors are retryable
     * 
     * @param error - The error to handle
     * @returns AppError with categorized error information
     */
    private handleError(error: unknown): AppError {
        // Handle AWS SDK errors
        if (error && typeof error === 'object' && 'name' in error) {
            const awsError = error as { name: string; message: string; $metadata?: { httpStatusCode?: number } };

            // Authentication/Authorization errors
            if (awsError.name === 'UnauthorizedException' || awsError.name === 'AccessDeniedException') {
                return {
                    message: 'Authentication failed. Please check your AWS credentials.',
                    category: 'api',
                    retryable: false,
                    originalError: error,
                };
            }

            // Rate limiting
            if (awsError.name === 'ThrottlingException' || awsError.$metadata?.httpStatusCode === 429) {
                return {
                    message: 'Too many requests. Please wait a moment and try again.',
                    category: 'api',
                    retryable: true,
                    originalError: error,
                };
            }

            // Model errors (validation, content policy, etc.)
            if (awsError.name === 'ValidationException' || awsError.$metadata?.httpStatusCode === 400) {
                return {
                    message: `Invalid request: ${awsError.message}`,
                    category: 'validation',
                    retryable: false,
                    originalError: error,
                };
            }

            // Service unavailable
            if (awsError.name === 'ServiceUnavailableException' || awsError.$metadata?.httpStatusCode === 503) {
                return {
                    message: 'Service temporarily unavailable. Please try again later.',
                    category: 'api',
                    retryable: true,
                    originalError: error,
                };
            }

            // Timeout errors
            if (awsError.name === 'TimeoutError' || awsError.message.includes('timeout')) {
                return {
                    message: 'Request timed out. Please try again.',
                    category: 'network',
                    retryable: true,
                    originalError: error,
                };
            }
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                message: 'Network error. Please check your connection and try again.',
                category: 'network',
                retryable: true,
                originalError: error,
            };
        }

        // Handle parsing errors
        if (error instanceof Error && error.message.includes('parse')) {
            return {
                message: 'Failed to process the response. Please try again.',
                category: 'client',
                retryable: false,
                originalError: error,
            };
        }

        // Handle encoding errors
        if (error instanceof Error && error.message.includes('encode')) {
            return {
                message: 'Failed to process the image. Please try a different image.',
                category: 'client',
                retryable: false,
                originalError: error,
            };
        }

        // Generic error
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return {
            message: errorMessage,
            category: 'client',
            retryable: false,
            originalError: error,
        };
    }
}
