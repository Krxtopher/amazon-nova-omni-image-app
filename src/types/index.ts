/**
 * Core types and interfaces for the AI Image Generator application
 */

// Image types
export type {
    GeneratedImage,
    GeneratedText,
    GalleryItem,
    EditSource,
    GenerationRequest,
    GenerationResponse,
    ConverseRequestParams,
    ImageMetadata,
    ImageData,
} from './image';

export type {
    ImageStatus,
    AspectRatio,
    PromptEnhancement,
} from './image';

// Bedrock API types
export type {
    ConverseMessageContent,
    ConverseMessage,
    ConverseResponse,
} from './bedrock';

// Error types
export type {
    AppError,
    ApiErrorResponse,
} from './error';

export type {
    ErrorCategory,
} from './error';
