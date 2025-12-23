import type { StreamingErrorCategory } from '../types/error';

/**
 * Fallback modes for different error scenarios
 */
export type FallbackMode =
    | 'original_prompt'      // Fall back to displaying original prompt
    | 'partial_enhancement'  // Use partial enhancement received
    | 'instant_display'      // Skip word-by-word display, show instantly
    | 'retry_with_backoff'   // Retry with exponential backoff
    | 'circuit_breaker';     // Circuit breaker activated

/**
 * Structured streaming error information
 */
export interface StreamingError {
    message: string;
    category: StreamingErrorCategory;
    retryable: boolean;
    originalError?: unknown;
    fallbackMode: FallbackMode;
    shouldRetry: boolean;
    retryAfterMs?: number;
    partialData?: string;
    circuitBreakerTriggered?: boolean;
}

/**
 * Circuit breaker state for managing repeated failures
 */
interface CircuitBreakerState {
    failureCount: number;
    lastFailureTime: number;
    state: 'closed' | 'open' | 'half-open';
    nextAttemptTime: number;
}

/**
 * Configuration for streaming error handling
 */
export interface StreamingErrorConfig {
    maxRetries: number;
    baseRetryDelayMs: number;
    maxRetryDelayMs: number;
    circuitBreakerThreshold: number;
    circuitBreakerTimeoutMs: number;
    enableDetailedLogging: boolean;
}

/**
 * Default configuration for streaming error handling
 */
const DEFAULT_STREAMING_ERROR_CONFIG: StreamingErrorConfig = {
    maxRetries: 3,
    baseRetryDelayMs: 1000,
    maxRetryDelayMs: 10000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 60000, // 1 minute
    enableDetailedLogging: true
};

/**
 * Comprehensive error handler for streaming prompt enhancement operations
 * Provides categorized error responses, circuit breaker functionality, and fallback modes
 */
export class StreamingErrorHandler {
    private config: StreamingErrorConfig;
    private circuitBreaker: CircuitBreakerState;

    constructor(config?: Partial<StreamingErrorConfig>) {
        this.config = { ...DEFAULT_STREAMING_ERROR_CONFIG, ...config };
        this.circuitBreaker = {
            failureCount: 0,
            lastFailureTime: 0,
            state: 'closed',
            nextAttemptTime: 0
        };
    }

    /**
     * Handle streaming enhancement errors with categorization and fallback determination
     * @param error - The error to handle
     * @param originalPrompt - The original user prompt for fallback
     * @param partialData - Any partial enhancement data received
     * @returns Structured streaming error with fallback strategy
     */
    handleStreamingError(
        error: unknown,
        originalPrompt: string,
        partialData?: string
    ): StreamingError {
        // Check circuit breaker state first
        if (this.circuitBreaker.state === 'open') {
            return this.createCircuitBreakerError(originalPrompt);
        }

        // Categorize the error
        const streamingError = this.categorizeStreamingError(error, originalPrompt, partialData);

        // Update circuit breaker based on error
        this.updateCircuitBreaker(streamingError);

        // Log error details if enabled
        if (this.config.enableDetailedLogging) {
            this.logErrorDetails(streamingError, error);
        }

        return streamingError;
    }

    /**
     * Handle word display errors during the display phase
     * @param error - The display error
     * @param text - The text being displayed
     * @returns Fallback strategy for display errors
     */
    handleDisplayError(error: unknown, _text: string): {
        fallbackMode: 'instant' | 'simplified';
        shouldCleanup: boolean;
        userMessage: string;
    } {
        const errorMessage = this.extractErrorMessage(error);

        // Log display error only for critical issues
        if (this.config.enableDetailedLogging && this.isResourceError(error)) {
            console.warn('Critical display error - falling back to instant mode:', errorMessage);
        }

        // Determine fallback strategy based on error type
        if (this.isResourceError(error)) {
            return {
                fallbackMode: 'instant',
                shouldCleanup: true,
                userMessage: 'Display system encountered a resource issue. Showing text instantly.'
            };
        }

        if (this.isAnimationError(error)) {
            return {
                fallbackMode: 'simplified',
                shouldCleanup: false,
                userMessage: 'Animation system unavailable. Using simplified display.'
            };
        }

        // Default fallback
        return {
            fallbackMode: 'instant',
            shouldCleanup: true,
            userMessage: 'Display error occurred. Showing text instantly.'
        };
    }

    /**
     * Check if circuit breaker allows new requests
     * @returns true if requests are allowed, false if circuit is open
     */
    canMakeRequest(): boolean {
        const now = Date.now();

        switch (this.circuitBreaker.state) {
            case 'closed':
                return true;

            case 'open':
                if (now >= this.circuitBreaker.nextAttemptTime) {
                    this.circuitBreaker.state = 'half-open';
                    return true;
                }
                return false;

            case 'half-open':
                return true;

            default:
                return true;
        }
    }

    /**
     * Record a successful operation to reset circuit breaker
     */
    recordSuccess(): void {
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.nextAttemptTime = 0;
    }

    /**
     * Get current circuit breaker state for monitoring
     */
    getCircuitBreakerState(): Readonly<CircuitBreakerState> {
        return { ...this.circuitBreaker };
    }

    /**
     * Reset circuit breaker manually (for testing or admin operations)
     */
    resetCircuitBreaker(): void {
        this.circuitBreaker = {
            failureCount: 0,
            lastFailureTime: 0,
            state: 'closed',
            nextAttemptTime: 0
        };
    }

    /**
     * Categorize streaming errors and determine appropriate fallback
     */
    private categorizeStreamingError(
        error: unknown,
        _originalPrompt: string,
        partialData?: string
    ): StreamingError {
        // Handle cancellation/abort errors
        if (this.isCancellationError(error)) {
            return {
                message: 'Streaming was cancelled by user',
                category: 'streaming_cancellation',
                fallbackMode: partialData ? 'partial_enhancement' : 'original_prompt',
                retryable: false,
                shouldRetry: false,
                originalError: error,
                partialData
            };
        }

        // Handle validation errors (check before other error types)
        if (this.isValidationError(error)) {
            return {
                message: 'Invalid prompt or configuration. Using original prompt.',
                category: 'streaming_validation',
                fallbackMode: 'original_prompt',
                retryable: false,
                shouldRetry: false,
                originalError: error
            };
        }

        // Handle resource/memory errors (check before generic errors)
        if (this.isResourceError(error)) {
            return {
                message: 'System resources unavailable. Using simplified display.',
                category: 'streaming_resource',
                fallbackMode: 'instant_display',
                retryable: false,
                shouldRetry: false,
                originalError: error
            };
        }

        // Handle timeout errors
        if (this.isTimeoutError(error)) {
            return {
                message: 'Streaming request timed out. Using available content.',
                category: 'streaming_timeout',
                fallbackMode: partialData ? 'partial_enhancement' : 'original_prompt',
                retryable: true,
                shouldRetry: true,
                retryAfterMs: this.calculateRetryDelay(1),
                originalError: error,
                partialData
            };
        }

        // Handle network errors
        if (this.isNetworkError(error)) {
            return {
                message: 'Network connection failed during streaming. Please check your connection.',
                category: 'streaming_network',
                fallbackMode: 'original_prompt',
                retryable: true,
                shouldRetry: true,
                retryAfterMs: this.calculateRetryDelay(2),
                originalError: error
            };
        }

        // Handle AWS API errors
        if (this.isAwsError(error)) {
            return this.handleAwsStreamingError(error, _originalPrompt, partialData);
        }

        // Generic streaming error
        return {
            message: 'Streaming enhancement encountered an error. Using original prompt.',
            category: 'streaming_api',
            fallbackMode: 'original_prompt',
            retryable: true,
            shouldRetry: true,
            retryAfterMs: this.calculateRetryDelay(1),
            originalError: error
        };
    }

    /**
     * Handle AWS-specific streaming errors
     */
    private handleAwsStreamingError(
        error: any,
        _originalPrompt: string,
        partialData?: string
    ): StreamingError {
        const errorName = error.name || '';
        const statusCode = error.$metadata?.httpStatusCode;

        // Authentication/Authorization errors
        if (statusCode === 403 || errorName.includes('AccessDenied') || errorName.includes('Unauthorized')) {
            return {
                message: 'Authentication failed. Please check your AWS credentials.',
                category: 'streaming_api',
                fallbackMode: 'original_prompt',
                retryable: false,
                shouldRetry: false,
                originalError: error
            };
        }

        // Rate limiting/throttling
        if (statusCode === 429 || errorName.includes('Throttling') || errorName.includes('TooManyRequests')) {
            return {
                message: 'Too many requests. Please wait before trying again.',
                category: 'streaming_api',
                fallbackMode: partialData ? 'partial_enhancement' : 'original_prompt',
                retryable: true,
                shouldRetry: true,
                retryAfterMs: this.calculateRetryDelay(3), // Longer delay for rate limiting
                originalError: error,
                partialData
            };
        }

        // Model/service errors
        if (statusCode === 400 || errorName.includes('ValidationException') || errorName.includes('ModelError')) {
            return {
                message: 'AI model encountered an error. Using original prompt.',
                category: 'streaming_api',
                fallbackMode: 'original_prompt',
                retryable: false,
                shouldRetry: false,
                originalError: error
            };
        }

        // Service unavailable
        if (statusCode === 503 || errorName.includes('ServiceUnavailable')) {
            return {
                message: 'Service temporarily unavailable. Please try again later.',
                category: 'streaming_api',
                fallbackMode: partialData ? 'partial_enhancement' : 'original_prompt',
                retryable: true,
                shouldRetry: true,
                retryAfterMs: this.calculateRetryDelay(4), // Longer delay for service issues
                originalError: error,
                partialData
            };
        }

        // Generic AWS error
        return {
            message: error.message || 'AWS service error occurred during streaming.',
            category: 'streaming_api',
            fallbackMode: 'original_prompt',
            retryable: statusCode ? statusCode >= 500 : false,
            shouldRetry: statusCode ? statusCode >= 500 : false,
            retryAfterMs: statusCode && statusCode >= 500 ? this.calculateRetryDelay(2) : undefined,
            originalError: error
        };
    }

    /**
     * Create circuit breaker error response
     */
    private createCircuitBreakerError(_originalPrompt: string): StreamingError {
        const timeUntilReset = Math.max(0, this.circuitBreaker.nextAttemptTime - Date.now());

        return {
            message: `Streaming service temporarily disabled due to repeated failures. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`,
            category: 'streaming_api',
            fallbackMode: 'original_prompt',
            retryable: true,
            shouldRetry: false,
            circuitBreakerTriggered: true,
            retryAfterMs: timeUntilReset,
            originalError: new Error('Circuit breaker open')
        };
    }

    /**
     * Update circuit breaker state based on error
     */
    private updateCircuitBreaker(error: StreamingError): void {
        const now = Date.now();

        // Don't count certain errors toward circuit breaker
        if (error.category === 'streaming_cancellation' ||
            error.category === 'streaming_validation') {
            return;
        }

        // Record failure
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = now;

        // Check if we should open the circuit
        if (this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
            this.circuitBreaker.state = 'open';
            this.circuitBreaker.nextAttemptTime = now + this.config.circuitBreakerTimeoutMs;

            if (this.config.enableDetailedLogging) {
                console.warn('Circuit breaker opened - streaming temporarily disabled');
            }
        }
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay(attempt: number): number {
        const delay = Math.min(
            this.config.baseRetryDelayMs * Math.pow(2, attempt - 1),
            this.config.maxRetryDelayMs
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        return Math.floor(delay + jitter);
    }

    /**
     * Log essential error information for debugging
     */
    private logErrorDetails(streamingError: StreamingError, originalError: unknown): void {
        console.warn('Streaming error:', streamingError.category, '-', this.extractErrorMessage(originalError));
    }

    /**
     * Extract user-friendly error message from any error type
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String((error as any).message);
        }
        return 'Unknown error occurred';
    }

    // Error type detection methods
    private isCancellationError(error: unknown): boolean {
        if (error instanceof Error) {
            return error.name === 'AbortError' ||
                error.message.includes('cancelled') ||
                error.message.includes('aborted');
        }

        // Handle plain objects with name/message properties
        if (error && typeof error === 'object' && 'name' in error) {
            const errorObj = error as { name: string; message?: string };
            return errorObj.name === 'AbortError' ||
                (errorObj.message ? (
                    errorObj.message.includes('cancelled') ||
                    errorObj.message.includes('aborted')
                ) : false);
        }

        return false;
    }

    private isTimeoutError(error: unknown): boolean {
        return error instanceof Error &&
            (error.name === 'TimeoutError' ||
                error.message.toLowerCase().includes('timeout'));
    }

    private isNetworkError(error: unknown): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('network') ||
                message.includes('fetch') ||
                message.includes('connection') ||
                message.includes('econnrefused') ||
                message.includes('enotfound');
        }
        return false;
    }

    private isAwsError(error: unknown): boolean {
        return !!(error &&
            typeof error === 'object' &&
            ('$metadata' in error ||
                ('name' in error && typeof (error as any).name === 'string')));
    }

    private isValidationError(error: unknown): boolean {
        if (error instanceof Error) {
            return error.name === 'ValidationError' ||
                error.message.includes('validation') ||
                error.message.includes('invalid');
        }

        // Handle plain objects with name/message properties
        if (error && typeof error === 'object' && 'name' in error) {
            const errorObj = error as { name: string; message?: string };
            return errorObj.name === 'ValidationError' ||
                (errorObj.message ? (
                    errorObj.message.includes('validation') ||
                    errorObj.message.includes('invalid')
                ) : false);
        }

        return false;
    }

    private isResourceError(error: unknown): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('memory') ||
                message.includes('resource') ||
                message.includes('allocation') ||
                message.includes('out of memory');
        }
        return false;
    }

    private isAnimationError(error: unknown): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('animation') ||
                message.includes('transition') ||
                message.includes('requestanimationframe');
        }
        return false;
    }
}

/**
 * Default instance for global use
 */
export const streamingErrorHandler = new StreamingErrorHandler();