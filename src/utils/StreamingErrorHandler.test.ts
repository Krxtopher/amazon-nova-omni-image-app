import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingErrorHandler } from './StreamingErrorHandler';
import type { StreamingErrorConfig } from './StreamingErrorHandler';

describe('StreamingErrorHandler', () => {
    let handler: StreamingErrorHandler;
    let mockConsoleWarn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        handler = new StreamingErrorHandler();
        mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        mockConsoleWarn.mockRestore();
    });

    describe('handleStreamingError', () => {
        it('should categorize cancellation errors correctly', () => {
            const abortError = new Error('Request was cancelled');
            abortError.name = 'AbortError';

            const result = handler.handleStreamingError(abortError, 'test prompt');

            expect(result.category).toBe('streaming_cancellation');
            expect(result.fallbackMode).toBe('original_prompt');
            expect(result.shouldRetry).toBe(false);
            expect(result.message).toContain('cancelled');
        });

        it('should handle cancellation with partial data', () => {
            const abortError = new Error('Request was cancelled');
            abortError.name = 'AbortError';

            const result = handler.handleStreamingError(abortError, 'test prompt', 'partial text');

            expect(result.category).toBe('streaming_cancellation');
            expect(result.fallbackMode).toBe('partial_enhancement');
            expect(result.partialData).toBe('partial text');
        });

        it('should categorize timeout errors correctly', () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'TimeoutError';

            const result = handler.handleStreamingError(timeoutError, 'test prompt');

            expect(result.category).toBe('streaming_timeout');
            expect(result.fallbackMode).toBe('original_prompt');
            expect(result.shouldRetry).toBe(true);
            expect(result.retryAfterMs).toBeGreaterThan(0);
        });

        it('should categorize network errors correctly', () => {
            const networkError = new Error('Network connection failed');

            const result = handler.handleStreamingError(networkError, 'test prompt');

            expect(result.category).toBe('streaming_network');
            expect(result.fallbackMode).toBe('original_prompt');
            expect(result.shouldRetry).toBe(true);
        });

        it('should handle AWS authentication errors', () => {
            const awsError = {
                name: 'UnauthorizedException',
                message: 'Access denied',
                $metadata: { httpStatusCode: 403 }
            };

            const result = handler.handleStreamingError(awsError, 'test prompt');

            expect(result.category).toBe('streaming_api');
            expect(result.fallbackMode).toBe('original_prompt');
            expect(result.shouldRetry).toBe(false);
            expect(result.message).toContain('Authentication failed');
        });

        it('should handle AWS throttling errors with retry', () => {
            const throttleError = {
                name: 'ThrottlingException',
                message: 'Too many requests',
                $metadata: { httpStatusCode: 429 }
            };

            const result = handler.handleStreamingError(throttleError, 'test prompt');

            expect(result.category).toBe('streaming_api');
            expect(result.shouldRetry).toBe(true);
            expect(result.retryAfterMs).toBeGreaterThan(0);
        });

        it('should handle validation errors', () => {
            const validationError = new Error('Invalid input');
            validationError.name = 'ValidationError';

            const result = handler.handleStreamingError(validationError, 'test prompt');

            expect(result.category).toBe('streaming_validation');
            expect(result.fallbackMode).toBe('original_prompt');
            expect(result.shouldRetry).toBe(false);
        });

        it('should handle resource errors', () => {
            const resourceError = new Error('Out of memory');

            const result = handler.handleStreamingError(resourceError, 'test prompt');

            expect(result.category).toBe('streaming_resource');
            expect(result.fallbackMode).toBe('instant_display');
            expect(result.shouldRetry).toBe(false);
        });
    });

    describe('handleDisplayError', () => {
        it('should handle resource errors with cleanup', () => {
            const resourceError = new Error('Memory allocation failed');

            const result = handler.handleDisplayError(resourceError, 'test text');

            expect(result.fallbackMode).toBe('instant');
            expect(result.shouldCleanup).toBe(true);
            expect(result.userMessage).toContain('resource issue');
        });

        it('should handle animation errors without cleanup', () => {
            const animationError = new Error('Animation frame failed');

            const result = handler.handleDisplayError(animationError, 'test text');

            expect(result.fallbackMode).toBe('simplified');
            expect(result.shouldCleanup).toBe(false);
            expect(result.userMessage).toContain('simplified display');
        });

        it('should default to instant display for unknown errors', () => {
            const unknownError = new Error('Unknown error');

            const result = handler.handleDisplayError(unknownError, 'test text');

            expect(result.fallbackMode).toBe('instant');
            expect(result.shouldCleanup).toBe(true);
        });
    });

    describe('Circuit Breaker', () => {
        it('should allow requests when circuit is closed', () => {
            expect(handler.canMakeRequest()).toBe(true);
        });

        it('should open circuit after threshold failures', () => {
            const config: Partial<StreamingErrorConfig> = {
                circuitBreakerThreshold: 2,
                circuitBreakerTimeoutMs: 1000
            };
            handler = new StreamingErrorHandler(config);

            // Trigger failures to reach threshold
            const error = new Error('API error');
            handler.handleStreamingError(error, 'test');
            handler.handleStreamingError(error, 'test');

            // Circuit should be open now
            expect(handler.canMakeRequest()).toBe(false);
            expect(handler.getCircuitBreakerState().state).toBe('open');
        });

        it('should not count cancellation errors toward circuit breaker', () => {
            const config: Partial<StreamingErrorConfig> = {
                circuitBreakerThreshold: 2
            };
            handler = new StreamingErrorHandler(config);

            const cancelError = new Error('Cancelled');
            cancelError.name = 'AbortError';

            // Multiple cancellation errors shouldn't open circuit
            handler.handleStreamingError(cancelError, 'test');
            handler.handleStreamingError(cancelError, 'test');
            handler.handleStreamingError(cancelError, 'test');

            expect(handler.canMakeRequest()).toBe(true);
            expect(handler.getCircuitBreakerState().state).toBe('closed');
        });

        it('should reset circuit breaker on success', () => {
            const config: Partial<StreamingErrorConfig> = {
                circuitBreakerThreshold: 2
            };
            handler = new StreamingErrorHandler(config);

            // Trigger failure
            const error = new Error('API error');
            handler.handleStreamingError(error, 'test');

            expect(handler.getCircuitBreakerState().failureCount).toBe(1);

            // Record success should reset
            handler.recordSuccess();

            expect(handler.getCircuitBreakerState().failureCount).toBe(0);
            expect(handler.getCircuitBreakerState().state).toBe('closed');
        });

        it('should transition to half-open after timeout', async () => {
            const config: Partial<StreamingErrorConfig> = {
                circuitBreakerThreshold: 1,
                circuitBreakerTimeoutMs: 50 // Short timeout for testing
            };
            handler = new StreamingErrorHandler(config);

            // Open circuit
            const error = new Error('API error');
            handler.handleStreamingError(error, 'test');

            expect(handler.canMakeRequest()).toBe(false);

            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, 60));

            // Should allow request (half-open)
            expect(handler.canMakeRequest()).toBe(true);
            expect(handler.getCircuitBreakerState().state).toBe('half-open');
        });

        it('should create circuit breaker error when open', () => {
            const config: Partial<StreamingErrorConfig> = {
                circuitBreakerThreshold: 1,
                circuitBreakerTimeoutMs: 5000
            };
            handler = new StreamingErrorHandler(config);

            // Open circuit
            const error = new Error('API error');
            handler.handleStreamingError(error, 'test');

            // Next error should be circuit breaker error
            const result = handler.handleStreamingError(error, 'test prompt');

            expect(result.circuitBreakerTriggered).toBe(true);
            expect(result.message).toContain('temporarily disabled');
            expect(result.fallbackMode).toBe('original_prompt');
        });

        it('should reset circuit breaker manually', () => {
            const config: Partial<StreamingErrorConfig> = {
                circuitBreakerThreshold: 1
            };
            handler = new StreamingErrorHandler(config);

            // Open circuit
            const error = new Error('API error');
            handler.handleStreamingError(error, 'test');

            expect(handler.canMakeRequest()).toBe(false);

            // Manual reset
            handler.resetCircuitBreaker();

            expect(handler.canMakeRequest()).toBe(true);
            expect(handler.getCircuitBreakerState().state).toBe('closed');
        });
    });

    describe('Retry Delay Calculation', () => {
        it('should calculate exponential backoff delays', () => {
            const error = new Error('Network error');

            const result1 = handler.handleStreamingError(error, 'test');
            const result2 = handler.handleStreamingError(error, 'test');

            // Second retry should have longer delay (with some jitter tolerance)
            expect(result2.retryAfterMs).toBeGreaterThan(result1.retryAfterMs! * 0.9);
        });

        it('should cap retry delays at maximum', () => {
            const config: Partial<StreamingErrorConfig> = {
                maxRetryDelayMs: 1000
            };
            handler = new StreamingErrorHandler(config);

            const error = new Error('Network error');

            // Test with network error which should have retry delay
            const result = handler.handleStreamingError(error, 'test');

            // The delay should be capped at maxRetryDelayMs + jitter (10%)
            if (result.retryAfterMs) {
                expect(result.retryAfterMs).toBeLessThanOrEqual(1100); // Allow for jitter
            }
        });
    });

    describe('Error Logging', () => {
        it('should log detailed error information when enabled', () => {
            const config: Partial<StreamingErrorConfig> = {
                enableDetailedLogging: true
            };
            handler = new StreamingErrorHandler(config);

            const error = new Error('Test error');
            handler.handleStreamingError(error, 'test prompt', 'partial data');

            expect(mockConsoleWarn).toHaveBeenCalledWith(
                'Streaming error details:',
                expect.objectContaining({
                    category: expect.any(String),
                    fallbackMode: expect.any(String),
                    shouldRetry: expect.any(Boolean),
                    timestamp: expect.any(String)
                })
            );
        });

        it('should not log when detailed logging is disabled', () => {
            const config: Partial<StreamingErrorConfig> = {
                enableDetailedLogging: false
            };
            handler = new StreamingErrorHandler(config);

            const error = new Error('Test error');
            handler.handleStreamingError(error, 'test prompt');

            expect(mockConsoleWarn).not.toHaveBeenCalled();
        });
    });

    describe('Error Type Detection', () => {
        it('should detect AWS errors correctly', () => {
            const awsError = {
                name: 'ServiceException',
                $metadata: { httpStatusCode: 500 }
            };

            const result = handler.handleStreamingError(awsError, 'test');
            expect(result.category).toBe('streaming_api');
        });

        it('should detect network errors correctly', () => {
            const networkError = new Error('fetch failed');

            const result = handler.handleStreamingError(networkError, 'test');
            expect(result.category).toBe('streaming_network');
        });

        it('should handle unknown error types gracefully', () => {
            const unknownError = { weird: 'object' };

            const result = handler.handleStreamingError(unknownError, 'test');
            expect(result.category).toBe('streaming_api');
            expect(result.fallbackMode).toBe('original_prompt');
        });
    });
});