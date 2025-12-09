/**
 * Image generation status
 */
export type ImageStatus = 'pending' | 'generating' | 'complete' | 'error';

/**
 * Aspect ratio options for image generation
 */
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9';

/**
 * Generation response types
 */
export type GenerationResponse =
    | { type: 'image'; imageDataUrl: string }
    | { type: 'text'; text: string };

/**
 * Image entry in the gallery
 */
export interface GeneratedImage {
    id: string;
    url: string; // Base64 data URL or blob URL
    prompt: string;
    status: ImageStatus;
    aspectRatio: AspectRatio;
    width: number;
    height: number;
    createdAt: Date;
    error?: string;
}

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
    aspectRatio?: AspectRatio;
    editSource?: EditSource;
}
