import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { ConverseCommandOutput } from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { AspectRatio, GenerationRequest, AppError } from '../types';

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
 */
export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1344, height: 768 },
    '9:16': { width: 768, height: 1344 },
    '4:3': { width: 1152, height: 896 },
    '3:4': { width: 896, height: 1152 },
    '21:9': { width: 1536, height: 640 },
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
     * @param config - Configuration object containing AWS region and credentials
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
     * @param ratio - The aspect ratio to convert
     * @returns Object containing width and height in pixels
     */
    getDimensionsForAspectRatio(ratio: AspectRatio): { width: number; height: number } {
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
     * Generates an image using Amazon Bedrock's Nova 2 Omni model via the Converse API
     * Supports both text-to-image generation and image editing scenarios
     * 
     * @param request - Generation request containing prompt, aspect ratio, and optional edit source
     * @returns Promise resolving to a base64 data URL of the generated image
     * @throws AppError with categorized error information for various failure scenarios
     */
    async generateImage(request: GenerationRequest): Promise<string> {
        try {
            // Build the message content array
            // Using any[] to work with AWS SDK's complex ContentBlock union types
            const messageContent: any[] = [];

            // If there's an edit source, include the input image
            if (request.editSource) {
                const imageBytes = await this.encodeImageToBytes(request.editSource.url);

                // Determine image format from the URL or default to PNG
                let format: 'png' | 'jpeg' | 'gif' | 'webp' = 'png';
                if (typeof request.editSource.url === 'string') {
                    if (request.editSource.url.includes('image/jpeg') || request.editSource.url.includes('.jpg') || request.editSource.url.includes('.jpeg')) {
                        format = 'jpeg';
                    } else if (request.editSource.url.includes('image/gif') || request.editSource.url.includes('.gif')) {
                        format = 'gif';
                    } else if (request.editSource.url.includes('image/webp') || request.editSource.url.includes('.webp')) {
                        format = 'webp';
                    }
                }

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
            const command = new ConverseCommand({
                modelId: this.modelId,
                messages: [
                    {
                        role: 'user',
                        content: messageContent,
                    },
                ],
            });

            // Call the Bedrock API
            const response = await this.client.send(command);

            // Parse and return the generated image
            return this.parseConverseResponse(response);
        } catch (error) {
            // Handle and categorize errors
            throw this.handleError(error);
        }
    }

    /**
     * Parses the Converse API response to extract the generated image
     * Converts the image bytes to a base64 data URL for display
     * 
     * @param response - The ConverseCommand output from Bedrock
     * @returns Base64 data URL of the generated image
     * @throws Error if response format is invalid or image data is missing
     */
    private parseConverseResponse(response: ConverseCommandOutput): string {
        try {
            // Validate response structure
            if (!response.output?.message?.content) {
                throw new Error('Invalid response structure: missing content');
            }

            // Find the image in the response content
            const imageContent = response.output.message.content.find(
                (item) => item.image !== undefined
            );

            if (!imageContent?.image?.source?.bytes) {
                throw new Error('No image data found in response');
            }

            // Extract image bytes
            const imageBytes = imageContent.image.source.bytes;
            const format = imageContent.image.format || 'png';

            // Convert Uint8Array to base64
            const base64 = this.uint8ArrayToBase64(imageBytes);

            // Return as data URL
            return `data:image/${format};base64,${base64}`;
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
