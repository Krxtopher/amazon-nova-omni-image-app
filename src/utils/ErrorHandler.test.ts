import { describe, it, expect } from 'vitest';
import { ErrorHandler, ValidationError, ClientError } from './ErrorHandler';

describe('ErrorHandler', () => {
    describe('Validation Errors', () => {
        it('should categorize ValidationError correctly', () => {
            const error = new ValidationError('Prompt cannot be empty');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('validation');
            expect(result.message).toBe('Prompt cannot be empty');
            expect(result.retryable).toBe(false);
            expect(result.originalError).toBe(error);
        });
    });

    describe('AWS API Errors', () => {
        it('should handle 403 authentication errors', () => {
            const error = {
                name: 'AccessDeniedException',
                message: 'Access denied',
                $metadata: { httpStatusCode: 403 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('api');
            expect(result.message).toContain('Authentication failed');
            expect(result.retryable).toBe(false);
        });

        it('should handle 429 rate limiting errors', () => {
            const error = {
                name: 'ThrottlingException',
                message: 'Rate exceeded',
                $metadata: { httpStatusCode: 429 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('api');
            expect(result.message).toContain('Too many requests');
            expect(result.retryable).toBe(true);
        });

        it('should handle 400 validation errors', () => {
            const error = {
                name: 'ValidationException',
                message: 'Invalid input',
                $metadata: { httpStatusCode: 400 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('api');
            expect(result.message).toContain('Invalid request');
            expect(result.retryable).toBe(false);
        });

        it('should handle 503 service unavailable errors', () => {
            const error = {
                name: 'ServiceUnavailableException',
                message: 'Service unavailable',
                $metadata: { httpStatusCode: 503 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('api');
            expect(result.message).toContain('temporarily unavailable');
            expect(result.retryable).toBe(true);
        });

        it('should handle timeout errors', () => {
            const error = {
                name: 'TimeoutError',
                message: 'Request timeout',
                $metadata: { httpStatusCode: 408 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('network');
            expect(result.message).toContain('timed out');
            expect(result.retryable).toBe(true);
        });

        it('should handle model errors', () => {
            const error = {
                name: 'ModelError',
                message: 'Model failed',
                $metadata: { httpStatusCode: 500 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('api');
            expect(result.message).toContain('AI model encountered an error');
            expect(result.retryable).toBe(true);
        });

        it('should handle generic API errors with 5xx status codes as retryable', () => {
            const error = {
                name: 'InternalServerError',
                message: 'Internal error',
                $metadata: { httpStatusCode: 500 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('api');
            expect(result.retryable).toBe(true);
        });

        it('should handle generic API errors with 4xx status codes as non-retryable', () => {
            const error = {
                name: 'BadRequest',
                message: 'Bad request',
                $metadata: { httpStatusCode: 404 },
            };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('api');
            expect(result.retryable).toBe(false);
        });
    });

    describe('Network Errors', () => {
        it('should handle network connection errors', () => {
            const error = new Error('Network request failed');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('network');
            expect(result.message).toContain('Network connection failed');
            expect(result.retryable).toBe(true);
        });

        it('should handle fetch errors', () => {
            const error = new Error('fetch failed');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('network');
            expect(result.retryable).toBe(true);
        });

        it('should handle ECONNREFUSED errors', () => {
            const error = new Error('ECONNREFUSED');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('network');
            expect(result.retryable).toBe(true);
        });
    });

    describe('Client Errors', () => {
        it('should categorize ClientError correctly', () => {
            const error = new ClientError('Image encoding failed');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('client');
            expect(result.message).toBe('Image encoding failed');
            expect(result.retryable).toBe(false);
        });

        it('should handle encoding errors', () => {
            const error = new Error('Failed to encode image');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('client');
            expect(result.message).toContain('Failed to process image data');
            expect(result.retryable).toBe(false);
        });

        it('should handle base64 errors', () => {
            const error = new Error('Invalid base64 string');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('client');
            expect(result.message).toContain('Failed to process image data');
            expect(result.retryable).toBe(false);
        });

        it('should handle memory errors', () => {
            const error = new Error('Out of memory');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('client');
            expect(result.message).toContain('too large to process');
            expect(result.retryable).toBe(false);
        });
    });

    describe('Unknown Errors', () => {
        it('should handle unknown error types', () => {
            const error = { weird: 'object' };
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('client');
            expect(result.message).toContain('unexpected error');
            expect(result.retryable).toBe(true);
            expect(result.originalError).toBe(error);
        });

        it('should handle null errors', () => {
            const result = ErrorHandler.handleError(null);

            expect(result.category).toBe('client');
            expect(result.message).toContain('unexpected error');
            expect(result.retryable).toBe(true);
        });

        it('should handle string errors', () => {
            const result = ErrorHandler.handleError('Something went wrong');

            expect(result.category).toBe('client');
            expect(result.message).toContain('unexpected error');
            expect(result.retryable).toBe(true);
        });

        it('should handle generic Error with no specific pattern', () => {
            const error = new Error('Some random error');
            const result = ErrorHandler.handleError(error);

            expect(result.category).toBe('client');
            expect(result.message).toBe('Some random error');
            expect(result.retryable).toBe(false);
        });
    });

    describe('Error Message Quality', () => {
        it('should provide user-friendly messages for all error types', () => {
            const testCases = [
                { error: new ValidationError('test'), shouldContain: 'test' },
                { error: { name: 'AccessDeniedException', $metadata: {} }, shouldContain: 'credentials' },
                { error: { name: 'ThrottlingException', $metadata: {} }, shouldContain: 'wait' },
                { error: new Error('network failed'), shouldContain: 'connection' },
                { error: new ClientError('test'), shouldContain: 'test' },
            ];

            testCases.forEach(({ error, shouldContain }) => {
                const result = ErrorHandler.handleError(error);
                expect(result.message.toLowerCase()).toContain(shouldContain.toLowerCase());
            });
        });
    });

    describe('Retryable Logic', () => {
        it('should mark validation errors as non-retryable', () => {
            const error = new ValidationError('Invalid input');
            const result = ErrorHandler.handleError(error);
            expect(result.retryable).toBe(false);
        });

        it('should mark network errors as retryable', () => {
            const error = new Error('Network connection failed');
            const result = ErrorHandler.handleError(error);
            expect(result.retryable).toBe(true);
        });

        it('should mark rate limiting as retryable', () => {
            const error = { name: 'ThrottlingException', $metadata: {} };
            const result = ErrorHandler.handleError(error);
            expect(result.retryable).toBe(true);
        });

        it('should mark authentication errors as non-retryable', () => {
            const error = { name: 'AccessDeniedException', $metadata: {} };
            const result = ErrorHandler.handleError(error);
            expect(result.retryable).toBe(false);
        });

        it('should mark client errors as non-retryable', () => {
            const error = new ClientError('Encoding failed');
            const result = ErrorHandler.handleError(error);
            expect(result.retryable).toBe(false);
        });
    });
});
