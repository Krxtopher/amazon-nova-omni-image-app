import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { ConverseCommandOutput } from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { AspectRatio, GenerationRequest, GenerationResponse, AppError, ConverseRequestParams } from '../types';


/**
 * Configuration for BedrockImageService
 */
export interface BedrockServiceConfig {
    region: string;
    credentials: AwsCredentialIdentity;
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
 * Service class for interacting with Amazon Bedrock's Nova 2 Omni model
 * via the Converse API for image generation and editing.
 */
export class BedrockImageService {
    private client: BedrockRuntimeClient;
    private readonly modelId = 'us.amazon.nova-2-omni-v1:0';

    /**
     * Creates a new BedrockImageService instance
     * @param config - Configuration object containing AWS region, credentials, and optional system prompt
     */
    constructor(config: BedrockServiceConfig) {
        this.client = new BedrockRuntimeClient({
            region: config.region,
            credentials: config.credentials,
        });
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
            // Print full exception to console for debugging
            console.error('Bedrock Image Encoding Exception:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                service: 'BedrockImageService',
                method: 'encodeImageToBytes'
            });

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
     * Generates a creative 1-2 word persona name based on the persona description
     * 
     * @param personaDescription - The description of the persona
     * @returns Promise resolving to a creative persona name
     * @throws Error if name generation fails
     */
    async generatePersonaName(personaDescription: string): Promise<string> {
        if (!personaDescription.trim()) {
            throw new Error('Persona description is required for name generation');
        }

        try {
            const systemPrompt = `Are an expert in artistic style categorization. You have vast knowledge of mainstream as well as very niche styles and substyles. Your task is categorize a style based on a description of the style and/or the artist.
            
## Guidelines:
- The style name you provide should be distinct.
- The style name you provide should be limited 1-4 words long.
- Avoid mentioning artists by name and instead name their style.
- Always return a single style name as plain text. No formatting.
- The style should use Title Case.
`

            const userPrompt = `Artist Prsona Description: ${personaDescription}\nStyle Name: `

            const commandParams: any = {
                modelId: 'us.amazon.nova-2-lite-v1:0',
                messages: [
                    {
                        role: 'user',
                        content: [{ text: userPrompt }],
                    },
                ],
                system: [
                    {
                        text: systemPrompt
                    }
                ],
                inferenceConfig: {
                    temperature: 0.7,
                    topP: 0.5
                }
            };

            const command = new ConverseCommand(commandParams);
            const response = await this.client.send(command);

            // Extract the generated name from the response
            if (!response.output?.message?.content) {
                throw new Error('Invalid response structure: missing content');
            }

            const textContent = response.output.message.content.find(
                (item) => item.text !== undefined
            );

            if (!textContent?.text) {
                throw new Error('No text content found in name generation response');
            }

            return textContent.text.trim();
        } catch (error) {
            // Print full exception to console for debugging
            console.error('Bedrock Persona Name Generation Exception:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                message: error instanceof Error ? error.message : String(error),
                name: (error as any)?.name,
                metadata: (error as any)?.$metadata,
                timestamp: new Date().toISOString(),
                service: 'BedrockImageService',
                method: 'generatePersonaName'
            });

            throw new Error('Failed to generate persona name. Please try again.');
        }
    }

    /**
     * Generates a suitable icon name based on the persona description
     * Returns a Lucide React icon name that matches the persona's characteristics
     * 
     * @param personaDescription - The description of the persona
     * @returns Promise resolving to a Lucide React icon name
     * @throws Error if icon generation fails
     */
    async generatePersonaIcon(personaDescription: string): Promise<string> {
        if (!personaDescription.trim()) {
            throw new Error('Persona description is required for icon generation');
        }

        try {
            const systemPrompt = `You are an expert in visual iconography and UI design. Your task is to select the most appropriate Lucide React icon name based on a persona description.

## Available Icon Categories:
- Art & Design: Palette, Brush, Pen, PenTool, Paintbrush, Image, Camera, Aperture, Focus
- Nature: Flower, Tree, Sun, Moon, Star, Cloud, Mountain, Waves, Leaf
- Abstract: Sparkles, Zap, Flame, Heart, Diamond, Circle, Square, Triangle
- Tools: Wrench, Hammer, Scissors, Ruler, Compass, Gear, Settings
- Creative: Wand2, Magic, Lightbulb, Eye, Target, Crown, Gem
- Technology: Monitor, Smartphone, Tablet, Headphones, Mic, Radio
- Music: Music, Volume2, Play, Pause, SkipForward, Repeat
- Animals: Cat, Dog, Bird, Fish, Butterfly, Rabbit, Owl
- Objects: Book, Feather, Key, Lock, Gift, Trophy, Medal
- Emotions: Smile, Frown, Meh, Laugh, Heart, ThumbsUp

## Guidelines:
- Choose ONE icon name that best represents the persona's style or characteristics
- Return ONLY the exact Lucide React icon name (e.g., "Palette", "Sparkles", "Camera")
- Consider the artistic style, mood, and creative focus described
- Prefer creative and artistic icons for artistic personas
- Use abstract icons for conceptual or emotional styles
- Match the icon to the dominant theme or tool associated with the style
- Return ONLY the icon name with no quotes, asterisks, or other formatting
- Do not include explanations, descriptions, or additional text`

            const userPrompt = `Persona Description: ${personaDescription}\nIcon Name: `

            const commandParams: any = {
                modelId: 'us.amazon.nova-2-lite-v1:0',
                messages: [
                    {
                        role: 'user',
                        content: [{ text: userPrompt }],
                    },
                ],
                system: [
                    {
                        text: systemPrompt
                    }
                ],
                inferenceConfig: {
                    temperature: 0.3,
                    topP: 0.8
                }
            };

            const command = new ConverseCommand(commandParams);
            const response = await this.client.send(command);

            // Extract the generated icon name from the response
            if (!response.output?.message?.content) {
                throw new Error('Invalid response structure: missing content');
            }

            const textContent = response.output.message.content.find(
                (item) => item.text !== undefined
            );

            if (!textContent?.text) {
                throw new Error('No text content found in icon generation response');
            }

            // Clean up the response to extract just the icon name
            let iconName = textContent.text.trim();

            // Remove any markdown formatting (**, *, etc.)
            iconName = iconName.replace(/\*+/g, '');

            // Remove any extra whitespace
            iconName = iconName.trim();

            // If the response contains multiple words or lines, take the first word
            iconName = iconName.split(/\s+/)[0];

            return iconName;
        } catch (error) {
            // Print full exception to console for debugging
            console.error('Bedrock Persona Icon Generation Exception:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                message: error instanceof Error ? error.message : String(error),
                name: (error as any)?.name,
                metadata: (error as any)?.$metadata,
                timestamp: new Date().toISOString(),
                service: 'BedrockImageService',
                method: 'generatePersonaIcon'
            });

            throw new Error('Failed to generate persona icon. Please try again.');
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

            // If there's an edit source, include the input image
            if (request.editSource) {
                const imageBytes = await this.encodeImageToBytes(request.editSource.url);

                // Determine image format from the URL or file type
                const format = await this.detectImageFormat(request.editSource.url, imageBytes);

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

            const isEditRequest = request.editSource != null
            // Use custom system prompt if provided, otherwise use default
            const systemPrompt = request.customSystemPrompt || getSystemPrompt(isEditRequest);
            commandParams.system = [
                {
                    text: systemPrompt
                }
            ];

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
                                            // Omitting image data intentionally
                                        }
                                    }
                                };
                            }
                            return item;
                        }),
                    },
                ],
            };


            // Add system prompt if configured
            converseParams.system = commandParams.system

            // Call the Bedrock API directly
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
                    fullResponse: response,
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
                    fullResponse: response,
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
                fullResponse: response,
            };
        } catch (error) {
            // Print full exception to console for debugging
            console.error('Bedrock Response Parsing Exception:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                service: 'BedrockImageService',
                method: 'parseConverseResponse'
            });

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
        // Print full exception to console for debugging
        console.error('Bedrock API Exception:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            message: error instanceof Error ? error.message : String(error),
            name: (error as any)?.name,
            metadata: (error as any)?.$metadata,
            timestamp: new Date().toISOString(),
            service: 'BedrockImageService'
        });

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

function getSystemPrompt(isEditRequest: boolean = false) {
    return `Interpret all user messages as image ${isEditRequest ? "editing" : "generation"} requests. Never ask for clarification. Ambiguous requests are allowed.`
}