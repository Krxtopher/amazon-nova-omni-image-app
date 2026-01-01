import type { AspectRatio, GenerationRequest, GenerationResponse } from '../types';
import { amplifyLambdaService } from './AmplifyLambdaService';

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
 * Service class for interacting with Amazon Bedrock via Amplify Lambda functions
 * Replaces direct Bedrock calls with authenticated Lambda API calls for security
 */
export class BedrockImageService {
    private lambdaService = amplifyLambdaService;

    /**
     * Creates a new BedrockImageService instance
     * Now uses Lambda functions instead of direct Bedrock access
     * Config parameter kept for backward compatibility but is no longer used
     */
    constructor(_config?: any) {
        // Config is no longer needed as we use Lambda functions
        // Kept for backward compatibility
    }

    /**
     * Gets the model ID being used for image generation
     * @returns The Nova 2 Omni model ID
     */
    getModelId(): string {
        return this.lambdaService.getModelId();
    }

    /**
     * Gets the configured AWS region
     * @returns The AWS region string
     */
    async getRegion(): Promise<string> {
        return await this.lambdaService.getRegion();
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
        return this.lambdaService.getDimensionsForAspectRatio(ratio);
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
     * Generates a creative 1-2 word persona name based on the persona description
     * Now uses Lambda function instead of direct Bedrock access
     * 
     * @param personaDescription - The description of the persona
     * @returns Promise resolving to a creative persona name
     * @throws Error if name generation fails
     */
    async generatePersonaName(personaDescription: string): Promise<string> {
        if (!personaDescription.trim()) {
            throw new Error('Persona description is required for name generation');
        }

        return await this.lambdaService.generatePersonaName(personaDescription);
    }

    /**
     * Generates a suitable icon name based on the persona description
     * Returns a Lucide React icon name that matches the persona's characteristics
     * Now uses Lambda function instead of direct Bedrock access
     * 
     * @param personaDescription - The description of the persona
     * @returns Promise resolving to a Lucide React icon name
     * @throws Error if icon generation fails
     */
    async generatePersonaIcon(personaDescription: string): Promise<string> {
        if (!personaDescription.trim()) {
            throw new Error('Persona description is required for icon generation');
        }

        return await this.lambdaService.generatePersonaIcon(personaDescription);
    }

    /**
     * Generates content using Amazon Bedrock via Lambda functions
     * Replaces direct Bedrock calls with authenticated Lambda API calls
     * 
     * @param request - Generation request containing prompt, aspect ratio, and optional edit source
     * @returns Promise resolving to either an image data URL or text content
     * @throws AppError with categorized error information for various failure scenarios
     */
    async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
        try {
            return await this.lambdaService.generateContent(request);
        } catch (error) {
            // The Lambda service already handles error categorization
            throw error;
        }
    }
}