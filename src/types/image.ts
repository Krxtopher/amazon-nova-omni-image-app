/**
 * Image generation status
 */
export type ImageStatus = 'pending' | 'generating' | 'complete' | 'error';

/**
 * Aspect ratio options for image generation
 */
export type AspectRatio = '2:1' | '16:9' | '3:2' | '4:3' | '1:1' | '3:4' | '2:3' | '9:16' | '1:2';

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
