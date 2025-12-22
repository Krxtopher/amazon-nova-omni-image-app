/**
 * Image generation status
 */
export type ImageStatus = 'pending' | 'queued' | 'generating' | 'complete' | 'error';

/**
 * Aspect ratio options for image generation
 */
export type AspectRatio = 'random' | '2:1' | '16:9' | '3:2' | '4:3' | '1:1' | '3:4' | '2:3' | '9:16' | '1:2';

// Note: PromptEnhancement type moved to persona.ts to support custom persona IDs
import type { PromptEnhancement } from './persona';

/**
 * Generation response types
 */
export type GenerationResponse =
    | { type: 'image'; imageDataUrl: string; converseParams: ConverseRequestParams }
    | { type: 'text'; text: string; converseParams: ConverseRequestParams }
    | { type: 'error'; error: string; converseParams: ConverseRequestParams };

/**
 * Converse API request parameters for image generation
 */
export interface ConverseRequestParams {
    modelId: string;
    messages: Array<{
        role: 'user';
        content: Array<{
            text?: string;
            image?: {
                format: 'png' | 'jpeg' | 'gif' | 'webp';
                source: {
                    bytes?: Uint8Array;
                    _base64?: string; // Base64 encoded source image for editing
                };
            };
        }>;
    }>;
    system?: Array<{
        text: string;
    }>;
}

/**
 * Image metadata (loaded immediately)
 */
export interface ImageMetadata {
    id: string;
    prompt: string;
    status: ImageStatus;
    aspectRatio: AspectRatio;
    width: number;
    height: number;
    createdAt: Date;
    error?: string;
    converseParams?: ConverseRequestParams; // Original API request parameters
    hasBinaryData?: boolean; // Tracks if binary data exists in IndexedDB
    binaryDataSize?: number; // Size of binary data in bytes
}

/**
 * Image data (loaded on demand)
 */
export interface ImageData {
    id: string;
    url: string; // Base64 data URL or blob URL
}

/**
 * Complete image entry (metadata + data)
 */
export interface GeneratedImage extends ImageMetadata {
    url?: string; // Optional - loaded on demand
}

/**
 * Text response entry in the gallery
 */
export interface GeneratedText {
    id: string;
    content: string;
    prompt: string;
    status: ImageStatus;
    createdAt: Date;
    converseParams?: ConverseRequestParams; // Original API request parameters
}

/**
 * Union type for gallery items (images or text)
 */
export type GalleryItem = GeneratedImage | GeneratedText;

/**
 * Edit source image
 */
export interface EditSource {
    id?: string; // If from gallery
    url: string;
    aspectRatio: AspectRatio;
    width: number;
    height: number;
}

/**
 * Generation request
 */
export interface GenerationRequest {
    prompt: string;
    aspectRatio?: Exclude<AspectRatio, 'random'>;
    editSource?: EditSource;
    promptEnhancement?: PromptEnhancement;
}
