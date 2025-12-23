/**
 * Types and interfaces for streaming prompt enhancement and word-by-word display
 */

/**
 * Status of streaming enhancement system
 */
export type StreamingStatus = 'idle' | 'streaming' | 'complete' | 'error';

/**
 * State of streaming enhancement process
 */
export interface StreamingEnhancementState {
    status: 'idle' | 'streaming' | 'complete' | 'error';
    tokens: string[];
    accumulatedText: string;
    error?: string;
}

/**
 * Token received from streaming API
 */
export interface StreamingToken {
    text: string;
    isComplete: boolean; // Whether this completes a word
}

/**
 * Service interface for streaming prompt enhancement
 */
export interface StreamingPromptEnhancer {
    enhancePromptStreaming(
        originalPrompt: string,
        enhancementType: import('./persona').PromptEnhancement,
        onToken: (token: StreamingToken) => void,
        onComplete: (finalText: string) => void,
        onError: (error: string) => void
    ): Promise<void>;

    cancelStreaming(): void;
}