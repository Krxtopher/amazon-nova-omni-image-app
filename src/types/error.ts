/**
 * Error categories for error handling
 */
export type ErrorCategory = 'validation' | 'api' | 'network' | 'client';

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
