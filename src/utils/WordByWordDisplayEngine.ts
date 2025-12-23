/**
 * WordByWordDisplayEngine - Core engine for word-by-word text display
 * 
 * This class implements the word-by-word display system that reveals text
 * one word at a time with natural delays and fade-in animations.
 * 
 * Performance optimizations:
 * - Uses timer pooling for efficient resource management
 * - Coordinates with requestAnimationFrame for smooth animations
 * - Monitors performance metrics for debugging
 */

import type { WordDisplayConfig, DisplayWord, WordByWordDisplay } from '../types/streaming';
import { PerformanceOptimizer } from './PerformanceOptimizer';

/**
 * Default configuration for word-by-word display
 * @deprecated Use StreamingDisplayConfigService instead
 */
export const DEFAULT_WORD_DISPLAY_CONFIG: WordDisplayConfig = {
    baseDelay: { min: 50, max: 200 },
    longWordThreshold: 8,
    longWordDelayMultiplier: 1.5,
    punctuationDelays: {
        '.': 300,
        '!': 300,
        '?': 300,
        ',': 150,
        ';': 200,
        ':': 200,
    },
    fadeInDuration: { min: 100, max: 300 },
};

/**
 * Engine for displaying text word-by-word with natural timing and animations
 */
export class WordByWordDisplayEngine implements WordByWordDisplay {
    private activeTimerIds: Set<string> = new Set();
    private isActive: boolean = false;
    private config: WordDisplayConfig;
    private currentOnComplete?: () => void;
    private displayId: string;
    private performanceOptimizer: PerformanceOptimizer;

    constructor(config: WordDisplayConfig = DEFAULT_WORD_DISPLAY_CONFIG) {
        this.config = config;
        this.displayId = `display_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.performanceOptimizer = PerformanceOptimizer.getInstance();

        // Register this display for performance monitoring
        this.performanceOptimizer.registerDisplay(this.displayId);
    }

    /**
     * Start word-by-word display of the given text
     * @param text - Text to display word-by-word
     * @param config - Configuration for display timing and animations
     * @param onWordReveal - Callback for each word reveal
     * @param onComplete - Callback when display is complete
     */
    startDisplay(
        text: string,
        config: WordDisplayConfig,
        onWordReveal: (word: DisplayWord, index: number) => void,
        onComplete: () => void
    ): void {
        // Clean up any existing display
        this.cancelDisplay();

        this.isActive = true;
        this.currentOnComplete = onComplete;

        const words = this.parseTextIntoWords(text);

        if (words.length === 0) {
            onComplete();
            return;
        }

        let cumulativeDelay = 0;

        words.forEach((wordText, index) => {
            const delay = this.calculateWordDelay(wordText, index > 0 ? words[index - 1] : undefined, config);
            const fadeInDuration = this.calculateFadeInDuration(config);

            const displayWord: DisplayWord = {
                text: wordText,
                delay,
                fadeInDuration,
                isVisible: false,
                hasAnimated: false,
            };

            cumulativeDelay += delay;

            // Use performance-optimized timer
            const timerId = this.performanceOptimizer.createPooledTimer(() => {
                if (!this.isActive) return;

                // Use requestAnimationFrame for smooth word reveal
                this.performanceOptimizer.scheduleAnimationFrame(() => {
                    if (!this.isActive) return;

                    displayWord.isVisible = true;
                    displayWord.hasAnimated = true;

                    onWordReveal(displayWord, index);

                    // Remove this timer from active set
                    this.activeTimerIds.delete(timerId);

                    // Check if this is the last word
                    if (index === words.length - 1) {
                        this.isActive = false;
                        onComplete();
                    }
                });
            }, cumulativeDelay);

            this.activeTimerIds.add(timerId);
        });
    }

    /**
     * Cancel active display and clean up timers
     */
    cancelDisplay(): void {
        this.isActive = false;

        // Clear all active timers using performance optimizer
        this.activeTimerIds.forEach(timerId => {
            this.performanceOptimizer.removePooledTimer(timerId);
        });
        this.activeTimerIds.clear();

        this.currentOnComplete = undefined;
    }

    /**
     * Show all text instantly (for errors or cancellation)
     * @param _text - Text to show instantly (unused in this implementation)
     */
    showInstantly(_text: string): void {
        // Save the callback before canceling
        const callback = this.currentOnComplete;

        this.cancelDisplay();

        // For instant display, trigger completion callback immediately
        // Use requestAnimationFrame for smooth transition
        this.performanceOptimizer.scheduleAnimationFrame(() => {
            if (callback) {
                callback();
            }
        });
    }

    /**
     * Clean up all resources
     */
    cleanup(): void {
        this.cancelDisplay();

        // Unregister this display from performance monitoring
        this.performanceOptimizer.unregisterDisplay(this.displayId);
    }

    /**
     * Calculate delay for a word based on its characteristics
     * @param word - The word to calculate delay for
     * @param previousWord - The previous word (for context)
     * @param config - Configuration for delay calculation
     * @returns Delay in milliseconds
     */
    private calculateWordDelay(word: string, previousWord?: string, config?: WordDisplayConfig): number {
        const displayConfig = config || this.config;

        // Base random delay within configured range
        const baseDelay = Math.random() * (displayConfig.baseDelay.max - displayConfig.baseDelay.min) + displayConfig.baseDelay.min;

        let delay = baseDelay;

        // Adjust for long words
        if (word.length > displayConfig.longWordThreshold) {
            delay *= displayConfig.longWordDelayMultiplier;
        }

        // Add punctuation delays based on previous word
        if (previousWord) {
            const lastChar = previousWord[previousWord.length - 1];
            const punctuationDelay = displayConfig.punctuationDelays[lastChar];
            if (punctuationDelay) {
                delay += punctuationDelay;
            }
        }

        return Math.round(delay);
    }

    /**
     * Calculate fade-in duration with random variation
     * @param config - Configuration for fade-in duration
     * @returns Fade-in duration in milliseconds
     */
    private calculateFadeInDuration(config?: WordDisplayConfig): number {
        const displayConfig = config || this.config;
        const min = displayConfig.fadeInDuration.min;
        const max = displayConfig.fadeInDuration.max;
        return Math.round(Math.random() * (max - min) + min);
    }

    /**
     * Parse text into individual words
     * @param text - Text to parse
     * @returns Array of words
     */
    private parseTextIntoWords(text: string): string[] {
        if (!text || !text.trim()) {
            return [];
        }

        // Split on whitespace but preserve punctuation attached to words
        // This regex matches sequences of non-whitespace characters
        const words = text.match(/\S+/g) || [];

        return words;
    }
}