import { describe, it, expect, beforeEach } from 'vitest';
import { StreamingErrorHandler } from './StreamingErrorHandler';

describe('StreamingErrorHandler Integration', () => {
    let handler: StreamingErrorHandler;

    beforeEach(() => {
        handler = new StreamingErrorHandler({
            enableDetailedLogging: false // Disable logging for tests
        });
    });

    describe('Error Handling Logic', () => {
        it('should handle various error scenarios correctly', () => {
            // Test different error types
            const testCases = [
                {
                    error: new Error('Network connection failed'),
                    expectedCategory: 'streaming_network',
                    expectedRetryable: true
                },
                {
                    error: { name: 'AbortError', message: 'Request cancelled' },
                    expectedCategory: 'streaming_cancellation',
                    expectedRetryable: false
                },
                {
                    error: new Error('Invalid input'),
                    errorName: 'ValidationError',
                    expectedCategory: 'streaming_validation',
                    expectedRetryable: false
                },
                {
                    error: new Error('Out of memory'),
                    expectedCategory: 'streaming_resource',
                    expectedRetryable: false
                }
            ];

            testCases.forEach(({ error, errorName, expectedCategory, expectedRetryable }) => {
                // Set error name if specified
                if (errorName && error instanceof Error) {
                    error.name = errorName;
                }

                const result = handler.handleStreamingError(error, 'test prompt');

                expect(result.category).toBe(expectedCategory);
                expect(result.shouldRetry).toBe(expectedRetryable);
                expect(result.message).toBeTruthy();
                expect(result.fallbackMode).toBeTruthy();
            });
        });

        it('should provide appropriate fallback modes', () => {
            const testCases = [
                {
                    error: new Error('Network error'),
                    expectedFallback: 'original_prompt'
                },
                {
                    error: new Error('Out of memory'),
                    expectedFallback: 'instant_display'
                },
                {
                    error: { name: 'AbortError', message: 'Cancelled' },
                    partialData: 'partial text',
                    expectedFallback: 'partial_enhancement'
                }
            ];

            testCases.forEach(({ error, partialData, expectedFallback }) => {
                const result = handler.handleStreamingError(error, 'test prompt', partialData);
                expect(result.fallbackMode).toBe(expectedFallback);
            });
        });

        it('should handle circuit breaker correctly', () => {
            const config = {
                circuitBreakerThreshold: 2,
                circuitBreakerTimeoutMs: 1000,
                enableDetailedLogging: false
            };

            const testHandler = new StreamingErrorHandler(config);

            // Should allow initial requests
            expect(testHandler.canMakeRequest()).toBe(true);

            // Trigger failures
            const error = new Error('API error');
            testHandler.handleStreamingError(error, 'test');
            testHandler.handleStreamingError(error, 'test');

            // Circuit should be open
            expect(testHandler.canMakeRequest()).toBe(false);

            // Error should indicate circuit breaker
            const result = testHandler.handleStreamingError(error, 'test');
            expect(result.circuitBreakerTriggered).toBe(true);
        });

        it('should calculate retry delays correctly', () => {
            const networkError = new Error('Network connection failed');

            const result1 = handler.handleStreamingError(networkError, 'test');
            const result2 = handler.handleStreamingError(networkError, 'test');

            // Both should have retry delays
            expect(result1.retryAfterMs).toBeGreaterThan(0);
            expect(result2.retryAfterMs).toBeGreaterThan(0);

            // Should be within reasonable bounds (with jitter)
            expect(result1.retryAfterMs).toBeLessThan(5000);
            expect(result2.retryAfterMs).toBeLessThan(10000);
        });
    });

    describe('Display Error Handling', () => {
        it('should handle display errors appropriately', () => {
            const testCases = [
                {
                    error: new Error('Memory allocation failed'),
                    expectedFallback: 'instant',
                    expectedCleanup: true
                },
                {
                    error: new Error('Animation frame failed'),
                    expectedFallback: 'simplified',
                    expectedCleanup: false
                },
                {
                    error: new Error('Unknown display error'),
                    expectedFallback: 'instant',
                    expectedCleanup: true
                }
            ];

            testCases.forEach(({ error, expectedFallback, expectedCleanup }) => {
                const result = handler.handleDisplayError(error, 'test text');

                expect(result.fallbackMode).toBe(expectedFallback);
                expect(result.shouldCleanup).toBe(expectedCleanup);
                expect(result.userMessage).toBeTruthy();
            });
        });
    });
});