import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { PromptEnhancement, StreamingPromptEnhancer, StreamingToken } from '../types';
import { personaService } from './personaService';
import { STANDARD_PERSONAS } from './standardPersonas';
import { TokenAccumulator } from '../utils/TokenAccumulator';
import { StreamingErrorHandler, type StreamingError } from '../utils/StreamingErrorHandler';
import { processPromptTemplate } from '@/utils/promptTemplating';

/**
 * Configuration for StreamingPromptEnhancementService
 */
export interface StreamingServiceConfig {
    region: string;
    credentials: AwsCredentialIdentity;
}

/**
 * Error handling configuration for streaming enhancement
 */
interface StreamingErrorConfig {
    maxRetries: number;
    timeoutMs: number;
    fallbackToOriginal: boolean;
}

/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_CONFIG: StreamingErrorConfig = {
    maxRetries: 2,
    timeoutMs: 30000, // 30 seconds
    fallbackToOriginal: true
};

/**
 * Request context for tracking individual streaming requests
 */
interface StreamingRequestContext {
    id: string;
    abortController: AbortController;
    tokenAccumulator: TokenAccumulator;
    timeout: NodeJS.Timeout | null;
    startTime: number;
}

/**
 * Service class for streaming prompt enhancement using Amazon Bedrock's Nova 2 Omni model
 * via the ConverseStream API for real-time token streaming.
 * FIXED: Now supports concurrent requests by using per-request contexts
 */
export class StreamingPromptEnhancementService implements StreamingPromptEnhancer {
    private client: BedrockRuntimeClient;
    private readonly modelId = 'us.amazon.nova-2-omni-v1:0';
    private activeRequests: Map<string, StreamingRequestContext> = new Map();
    private errorConfig: StreamingErrorConfig;
    private errorHandler: StreamingErrorHandler;

    /**
     * Creates a new StreamingPromptEnhancementService instance
     * @param config - Configuration object containing AWS region and credentials
     * @param errorConfig - Optional error handling configuration
     */
    constructor(config: StreamingServiceConfig, errorConfig?: Partial<StreamingErrorConfig>) {
        this.client = new BedrockRuntimeClient({
            region: config.region,
            credentials: config.credentials,
        });
        this.errorConfig = { ...DEFAULT_ERROR_CONFIG, ...errorConfig };
        this.errorHandler = new StreamingErrorHandler(errorConfig);
    }

    /**
     * Enhances a user prompt using streaming API with real-time token processing
     * Includes comprehensive error handling, timeout detection, and fallback mechanisms
     * FIXED: Now supports concurrent requests by creating separate contexts
     * 
     * @param originalPrompt - The original user prompt to enhance
     * @param enhancementType - The type of enhancement to apply
     * @param onToken - Callback for each streaming token received
     * @param onComplete - Callback when enhancement is complete
     * @param onError - Callback for error handling
     */
    async enhancePromptStreaming(
        originalPrompt: string,
        enhancementType: PromptEnhancement,
        onToken: (token: StreamingToken) => void,
        onComplete: (finalText: string) => void,
        onError: (error: string) => void
    ): Promise<void> {
        // Create unique request context for this enhancement
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const requestContext: StreamingRequestContext = {
            id: requestId,
            abortController: new AbortController(),
            tokenAccumulator: new TokenAccumulator(),
            timeout: null,
            startTime: performance.now()
        };

        // Store the request context
        this.activeRequests.set(requestId, requestContext);

        // Wrap onComplete to record performance metrics and cleanup
        const wrappedOnComplete = (finalText: string) => {
            // Note: Performance monitoring removed
            // if (requestContext.startTime > 0) {
            //     this.performanceMonitoring.recordEnhancementTime(requestContext.startTime, performance.now());
            // }

            // Cleanup request context
            this.cleanupRequest(requestId);

            // Call original completion callback
            onComplete(finalText);
        };

        // Wrap onError to cleanup request context
        const wrappedOnError = (error: string) => {
            this.cleanupRequest(requestId);
            onError(error);
        };

        try {
            // Return original prompt if enhancement is off
            if (enhancementType === 'off') {
                // Simulate streaming for consistency by revealing original prompt word by word
                this.simulateStreamingForOriginalPrompt(originalPrompt, onToken, wrappedOnComplete);
                return;
            }

            // Check circuit breaker before attempting request
            if (!this.errorHandler.canMakeRequest()) {
                const circuitError = this.errorHandler.handleStreamingError(
                    new Error('Circuit breaker open'),
                    originalPrompt
                );
                this.handleFallback(circuitError, originalPrompt, onToken, wrappedOnComplete, wrappedOnError);
                return;
            }

            let retryCount = 0;
            let lastError: unknown = null;
            let partialData = '';

            // Retry loop for handling transient errors
            while (retryCount <= this.errorConfig.maxRetries) {
                try {
                    await this.attemptStreamingEnhancement(
                        requestContext,
                        originalPrompt,
                        enhancementType,
                        onToken,
                        wrappedOnComplete,
                        wrappedOnError,
                        (data) => { partialData = data; } // Track partial data
                    );

                    // Success - record it and exit
                    this.errorHandler.recordSuccess();
                    return;
                } catch (error) {
                    // Print full exception to console for debugging
                    console.error('Bedrock Streaming API Exception:', {
                        error,
                        stack: error instanceof Error ? error.stack : undefined,
                        message: error instanceof Error ? error.message : String(error),
                        name: (error as any)?.name,
                        metadata: (error as any)?.$metadata,
                        timestamp: new Date().toISOString(),
                        service: 'StreamingPromptEnhancementService',
                        requestId: requestContext.id,
                        retryCount,
                        originalPrompt: originalPrompt.substring(0, 100) + '...' // Truncate for logging
                    });

                    lastError = error;
                    retryCount++;

                    // Use error handler to determine if we should retry
                    const streamingError = this.errorHandler.handleStreamingError(
                        error,
                        originalPrompt,
                        partialData
                    );

                    if (!streamingError.shouldRetry || retryCount > this.errorConfig.maxRetries) {
                        this.handleFallback(streamingError, originalPrompt, onToken, wrappedOnComplete, wrappedOnError);
                        return;
                    }

                    // Wait before retry if specified
                    if (streamingError.retryAfterMs) {
                        await this.sleep(streamingError.retryAfterMs);
                    }
                }
            }

            // All retries failed, handle final fallback
            const finalError = this.errorHandler.handleStreamingError(lastError, originalPrompt, partialData);
            this.handleFallback(finalError, originalPrompt, onToken, wrappedOnComplete, wrappedOnError);
        } catch (error) {
            // Print full exception to console for debugging
            console.error('Bedrock Streaming Service Exception:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                message: error instanceof Error ? error.message : String(error),
                name: (error as any)?.name,
                metadata: (error as any)?.$metadata,
                timestamp: new Date().toISOString(),
                service: 'StreamingPromptEnhancementService',
                requestId,
                context: 'enhancePromptStreaming'
            });

            // Ensure cleanup happens even if there's an unexpected error
            this.cleanupRequest(requestId);
            throw error;
        }
    }

    /**
     * Attempts streaming enhancement with timeout and interruption handling
     * FIXED: Now uses request context for concurrent request support
     */
    private async attemptStreamingEnhancement(
        requestContext: StreamingRequestContext,
        originalPrompt: string,
        enhancementType: PromptEnhancement,
        onToken: (token: StreamingToken) => void,
        onComplete: (finalText: string) => void,
        _onError: (error: string) => void, // Handled at higher level in enhancePromptStreaming
        onPartialData?: (data: string) => void // Track partial data for fallback
    ): Promise<void> {
        // Reset token accumulator for new stream
        requestContext.tokenAccumulator.reset();

        // Set up timeout for this specific request
        requestContext.timeout = setTimeout(() => {
            if (requestContext.abortController) {
                requestContext.abortController.abort();
            }
        }, this.errorConfig.timeoutMs);

        try {
            // Get system prompt based on enhancement type
            let systemPrompt = await this.getSystemPromptForEnhancement(enhancementType);
            if (!systemPrompt) {
                throw new Error('Unable to get system prompt for enhancement type');
            }

            // Process any template variables in the system prompt
            systemPrompt = processPromptTemplate(systemPrompt)

            // Build the streaming command
            const commandParams: any = {
                modelId: this.modelId,
                messages: [
                    {
                        role: 'user',
                        content: [{ text: originalPrompt }],
                    },
                ],
                system: [
                    {
                        text: systemPrompt
                    }
                ],
                inferenceConfig: {
                    temperature: 1.0
                }
            };

            // TEMP: Log
            console.log('Sending streaming command to Bedrock:', commandParams);

            const command = new ConverseStreamCommand(commandParams);

            // Send the streaming request directly
            const response = await this.client.send(command, {
                abortSignal: requestContext.abortController?.signal
            });

            if (!response.stream) {
                throw new Error('No stream received from Bedrock API');
            }

            let hasReceivedTokens = false;
            let partialText = '';

            // Process the streaming response
            for await (const chunk of response.stream) {
                // Check if stream was cancelled
                if (requestContext.abortController?.signal?.aborted) {
                    // Handle partial results if we received some tokens
                    if (hasReceivedTokens && partialText.trim()) {
                        if (onPartialData) {
                            onPartialData(partialText.trim());
                        }
                        onComplete(partialText.trim());
                        return;
                    }
                    throw new Error('Stream was cancelled');
                }

                // Process content block delta (text tokens)
                if (chunk.contentBlockDelta?.delta?.text) {
                    const tokenText = chunk.contentBlockDelta.delta.text;
                    hasReceivedTokens = true;
                    partialText += tokenText;

                    // Update partial data callback
                    if (onPartialData) {
                        onPartialData(partialText);
                    }

                    // Add token to accumulator and get completed words
                    const result = requestContext.tokenAccumulator.addTokenSync(tokenText);

                    // Send new completed words as tokens
                    result.newWords.forEach(word => {
                        onToken({
                            text: word,
                            isComplete: true
                        });
                    });

                    // Check if stream is complete
                    if (result.isComplete) {
                        break;
                    }
                }

                // Handle stream completion
                if (chunk.messageStop) {
                    break;
                }
            }

            // Get final accumulated text
            const finalText = requestContext.tokenAccumulator.getAccumulatedText().trim();

            // Validate we received meaningful content
            if (!finalText || finalText.length < 3) {
                throw new Error('Received empty or insufficient enhancement content');
            }

            // Call completion callback
            onComplete(finalText);

        } finally {
            // Clean up request-specific resources
            this.cleanupRequestResources(requestContext);
        }
    }

    /**
     * Handles fallback scenarios when streaming enhancement fails
     */
    private handleFallback(
        streamingError: StreamingError,
        originalPrompt: string,
        onToken: (token: StreamingToken) => void,
        onComplete: (finalText: string) => void,
        onError: (error: string) => void
    ): void {
        switch (streamingError.fallbackMode) {
            case 'partial_enhancement':
                if (streamingError.partialData && streamingError.partialData.trim()) {
                    this.simulateStreamingForOriginalPrompt(streamingError.partialData, onToken, onComplete);
                } else {
                    // No partial data available, fall back to original
                    this.simulateStreamingForOriginalPrompt(originalPrompt, onToken, onComplete);
                }
                break;

            case 'original_prompt':
                this.simulateStreamingForOriginalPrompt(originalPrompt, onToken, onComplete);
                break;

            case 'instant_display':
                // For instant display, we still use the original prompt but could signal to skip animations
                this.simulateStreamingForOriginalPrompt(originalPrompt, onToken, onComplete);
                break;

            case 'circuit_breaker':
                this.simulateStreamingForOriginalPrompt(originalPrompt, onToken, onComplete);
                break;

            case 'retry_with_backoff':
                // This should be handled at a higher level, but fallback to original as safety
                this.simulateStreamingForOriginalPrompt(originalPrompt, onToken, onComplete);
                break;

            default:
                // Unknown fallback mode, report error
                onError(streamingError.message);
                break;
        }
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clean up resources for a specific request
     */
    private cleanupRequestResources(requestContext: StreamingRequestContext): void {
        if (requestContext.timeout) {
            clearTimeout(requestContext.timeout);
            requestContext.timeout = null;
        }
    }

    /**
     * Clean up and remove a request context
     */
    private cleanupRequest(requestId: string): void {
        const requestContext = this.activeRequests.get(requestId);
        if (requestContext) {
            this.cleanupRequestResources(requestContext);
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * Cancels all active streaming requests and cleans up all resources
     * Handles cancellation during various streaming states safely
     */
    cancelStreaming(): void {
        // Abort all active streams
        for (const [requestId, requestContext] of this.activeRequests.entries()) {
            try {
                if (requestContext.abortController) {
                    requestContext.abortController.abort();
                }
            } catch (error) {
                // Print full exception to console for debugging
                console.error('Bedrock Stream Abort Exception:', {
                    error,
                    stack: error instanceof Error ? error.stack : undefined,
                    message: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString(),
                    service: 'StreamingPromptEnhancementService',
                    method: 'cancelRequest',
                    requestId
                });

                console.warn(`Error aborting stream for request ${requestId}:`, error);
            }
        }

        // Clean up all request contexts
        for (const requestId of this.activeRequests.keys()) {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Gets the appropriate system prompt for the enhancement type
     * @param enhancementType - The enhancement type
     * @returns Promise resolving to system prompt or null if not available
     */
    private async getSystemPromptForEnhancement(enhancementType: PromptEnhancement): Promise<string | null> {
        try {
            // Check if it's a built-in persona
            if (personaService.isBuiltInPersona(enhancementType)) {
                if (enhancementType === 'off') {
                    return null;
                }
                const persona = STANDARD_PERSONAS.find(p => p.id === enhancementType);
                return persona?.systemPrompt || null;
            } else {
                // Handle custom persona by ID
                return await personaService.getSystemPrompt(enhancementType);
            }
        } catch (error) {
            // Print full exception to console for debugging
            console.error('Bedrock System Prompt Exception:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                service: 'StreamingPromptEnhancementService',
                method: 'getSystemPromptForEnhancement',
                enhancementType
            });

            // Return null if we can't get system prompt
            return null;
        }
    }

    /**
     * Simulates streaming for original prompt by breaking it into words
     * This provides consistent behavior when no enhancement is needed
     * @param originalPrompt - The original prompt to simulate streaming for
     * @param onToken - Token callback
     * @param onComplete - Completion callback
     */
    private simulateStreamingForOriginalPrompt(
        originalPrompt: string,
        onToken: (token: StreamingToken) => void,
        onComplete: (finalText: string) => void
    ): void {
        // Split prompt into words
        const words = originalPrompt.trim().split(/\s+/).filter(word => word.length > 0);

        // Send each word as a completed token
        words.forEach(word => {
            onToken({
                text: word,
                isComplete: true
            });
        });

        // Complete immediately
        onComplete(originalPrompt);
    }

}