import type { AppError } from '../types/error';

/**
 * ErrorHandler utility for categorizing and handling errors
 * Provides user-friendly error messages and determines retry behavior
 */
export class ErrorHandler {
    /**
     * Handle an error and return structured error information
     * @param error - The error to handle (can be any type)
     * @returns Structured AppError with category, message, and retry info
     */
    static handleError(error: unknown): AppError {
        // Handle validation errors
        if (error instanceof ValidationError) {
            return {
                message: error.message,
                category: 'validation',
                retryable: false,
                originalError: error,
            };
        }

        // Handle client-side errors
        if (error instanceof ClientError) {
            return {
                message: error.message,
                category: 'client',
                retryable: false,
                originalError: error,
            };
        }

        // Handle network errors (check before AWS errors since Error objects can match both)
        if (this.isNetworkError(error)) {
            return {
                message: 'Network connection failed. Please check your internet connection and try again.',
                category: 'network',
                retryable: true,
                originalError: error,
            };
        }

        // Handle generic Error objects with specific patterns (before AWS check)
        if (error instanceof Error) {
            const categorized = this.categorizeGenericError(error);
            // If it's not a generic client error, it might be an AWS error
            if (categorized.category !== 'client' || !categorized.message.includes('unexpected')) {
                return categorized;
            }
        }

        // Handle AWS SDK errors
        if (this.isAwsError(error)) {
            return this.handleAwsError(error);
        }

        // Handle generic Error objects (fallback)
        if (error instanceof Error) {
            return this.categorizeGenericError(error);
        }

        // Handle unknown error types
        return {
            message: 'An unexpected error occurred. Please try again.',
            category: 'client',
            retryable: true,
            originalError: error,
        };
    }

    /**
     * Check if error is an AWS SDK error
     */
    private static isAwsError(error: unknown): error is AWSError {
        return (
            typeof error === 'object' &&
            error !== null &&
            ('$metadata' in error || 'name' in error && typeof (error as any).name === 'string')
        );
    }

    /**
     * Handle AWS SDK specific errors
     */
    private static handleAwsError(error: AWSError): AppError {
        const errorName = error.name || '';
        const statusCode = error.$metadata?.httpStatusCode;

        // Authentication/Authorization errors
        if (statusCode === 403 || errorName.includes('AccessDenied') || errorName.includes('Unauthorized')) {
            return {
                message: 'Authentication failed. Please check your AWS credentials and permissions.',
                category: 'api',
                retryable: false,
                originalError: error,
            };
        }

        // Rate limiting
        if (statusCode === 429 || errorName.includes('Throttling') || errorName.includes('TooManyRequests')) {
            return {
                message: 'Too many requests. Please wait a moment and try again.',
                category: 'api',
                retryable: true,
                originalError: error,
            };
        }

        // Bad request / validation errors
        if (statusCode === 400 || errorName.includes('ValidationException')) {
            return {
                message: 'Invalid request. Please check your input and try again.',
                category: 'api',
                retryable: false,
                originalError: error,
            };
        }

        // Service unavailable
        if (statusCode === 503 || errorName.includes('ServiceUnavailable')) {
            return {
                message: 'The service is temporarily unavailable. Please try again in a few moments.',
                category: 'api',
                retryable: true,
                originalError: error,
            };
        }

        // Timeout errors
        if (errorName.includes('Timeout') || errorName.includes('RequestTimeout')) {
            return {
                message: 'The request timed out. Please try again.',
                category: 'network',
                retryable: true,
                originalError: error,
            };
        }

        // Model-specific errors
        if (errorName.includes('ModelError') || errorName.includes('ModelNotReady')) {
            return {
                message: 'The AI model encountered an error. Please try again with a different prompt.',
                category: 'api',
                retryable: true,
                originalError: error,
            };
        }

        // Generic API error
        return {
            message: error.message || 'An error occurred while communicating with the service.',
            category: 'api',
            retryable: statusCode ? statusCode >= 500 : false,
            originalError: error,
        };
    }

    /**
     * Check if error is a network error
     */
    private static isNetworkError(error: unknown): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return (
                message.includes('network') ||
                message.includes('fetch') ||
                message.includes('connection') ||
                message.includes('econnrefused') ||
                message.includes('enotfound')
            );
        }
        return false;
    }

    /**
     * Categorize generic Error objects
     */
    private static categorizeGenericError(error: Error): AppError {
        const message = error.message.toLowerCase();

        // Check for encoding/decoding errors
        if (message.includes('encode') || message.includes('decode') || message.includes('base64')) {
            return {
                message: 'Failed to process image data. Please try a different image.',
                category: 'client',
                retryable: false,
                originalError: error,
            };
        }

        // Check for memory errors
        if (message.includes('memory') || message.includes('allocation')) {
            return {
                message: 'The image is too large to process. Please try a smaller image.',
                category: 'client',
                retryable: false,
                originalError: error,
            };
        }

        // Default to client error
        return {
            message: error.message || 'An unexpected error occurred.',
            category: 'client',
            retryable: false,
            originalError: error,
        };
    }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Custom error class for client-side errors
 */
export class ClientError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ClientError';
    }
}

/**
 * AWS Error interface (simplified)
 */
interface AWSError {
    name?: string;
    message?: string;
    $metadata?: {
        httpStatusCode?: number;
        requestId?: string;
    };
}
