/**
 * Types and interfaces for streaming prompt enhancement and word-by-word display
 */

/**
 * Status of word-by-word display system
 */
export type WordDisplayStatus = 'idle' | 'streaming' | 'revealing' | 'complete' | 'error';

/**
 * Individual word with timing and animation information
 */
export interface DisplayWord {
    text: string;
    delay: number; // Delay before showing this word (ms)
    fadeInDuration: number; // Fade-in animation duration (ms)
    isVisible: boolean;
    hasAnimated: boolean;
}

/**
 * Configuration for word-by-word display timing and animations
 */
export interface WordDisplayConfig {
    baseDelay: { min: number; max: number }; // 50-200ms range
    longWordThreshold: number; // 8 characters
    longWordDelayMultiplier: number; // 1.5x multiplier for long words
    punctuationDelays: Record<string, number>; // Additional delays for punctuation
    fadeInDuration: { min: number; max: number }; // 100-300ms range
}

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

/**
 * Service interface for word-by-word display
 */
export interface WordByWordDisplay {
    startDisplay(
        text: string,
        config: WordDisplayConfig,
        onWordReveal: (word: DisplayWord, index: number) => void,
        onComplete: () => void
    ): void;

    cancelDisplay(): void;
    showInstantly(text: string): void;
    cleanup(): void;
}