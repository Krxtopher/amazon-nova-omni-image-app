/**
 * Error categories for error handling
 */
export type ErrorCategory = 'validation' | 'api' | 'network' | 'client';

/**
 * Error categories specific to streaming operations
 */
export type StreamingErrorCategory =
    | 'streaming_network'
    | 'streaming_api'
    | 'streaming_timeout'
    | 'streaming_cancellation'
    | 'streaming_validation'
    | 'streaming_display'
    | 'streaming_resource';

/**
 * Structured error information
 */
export interface AppError {
    message: string;
    category: ErrorCategory;
    retryable: boolean;
    originalError?: unknown;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
    code?: string;
    message: string;
    statusCode?: number;
}
