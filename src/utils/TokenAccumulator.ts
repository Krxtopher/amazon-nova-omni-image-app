/**
 * TokenAccumulator utility for processing streaming tokens into complete words
 * 
 * This class handles the accumulation of streaming tokens from the Bedrock API
 * and segments them into complete words for word-by-word display.
 * 
 * NOTE: PerformanceOptimizer has been removed - now uses simple token processing
 */

export interface TokenAccumulationResult {
    newWords: string[];
    isComplete: boolean;
}

/**
 * Utility class for accumulating streaming tokens into complete words
 */
export class TokenAccumulator {
    private buffer: string = '';
    private completedWords: string[] = [];
    private pendingTokens: string[] = [];
    private isProcessingBatch: boolean = false;

    constructor(_displayId?: string) {
        // displayId parameter kept for compatibility but not used
    }
    /**
     * Add a new token to the accumulator and extract any completed words
     * NOTE: Simplified without PerformanceOptimizer - processes tokens directly
     * @param token - The token string received from the streaming API
     * @returns Object containing new completed words and completion status
     */
    addToken(token: string): TokenAccumulationResult {
        // Process token directly without buffering
        return this.processBatchedTokens([token]);
    }

    /**
     * Process a batch of tokens efficiently
     * @param tokens - Array of tokens to process
     * @returns Accumulation result
     */
    private processBatchedTokens(tokens: string[]): TokenAccumulationResult {
        if (this.isProcessingBatch) {
            // Queue tokens if already processing
            this.pendingTokens.push(...tokens);
            return { newWords: [], isComplete: false };
        }

        this.isProcessingBatch = true;

        try {
            // Process all tokens in batch
            for (const token of tokens) {
                this.buffer += token;
            }

            // Process any pending tokens
            if (this.pendingTokens.length > 0) {
                for (const token of this.pendingTokens) {
                    this.buffer += token;
                }
                this.pendingTokens = [];
            }

            // Extract completed words from current buffer
            const currentWords = this.extractCompletedWords();

            // Determine which words are new since last extraction
            const newWords = currentWords.slice(this.completedWords.length);

            // Update our completed words list
            this.completedWords = currentWords;

            // Check if stream is complete (check last token)
            const isComplete = tokens.length > 0 ? this.isStreamComplete(tokens[tokens.length - 1]) : false;

            return { newWords, isComplete };
        } finally {
            this.isProcessingBatch = false;
        }
    }

    /**
     * Add a single token synchronously (fallback method)
     * @param token - The token string received from the streaming API
     * @returns Object containing new completed words and completion status
     */
    addTokenSync(token: string): TokenAccumulationResult {
        // Add token to buffer
        this.buffer += token;

        // Extract completed words from current buffer
        const currentWords = this.extractCompletedWords();

        // Determine which words are new since last extraction
        const newWords = currentWords.slice(this.completedWords.length);

        // Update our completed words list
        this.completedWords = currentWords;

        return {
            newWords,
            isComplete: this.isStreamComplete(token)
        };
    }

    /**
     * Extract completed words from the current buffer
     * Handles various punctuation and whitespace scenarios
     * @returns Array of completed words
     */
    extractCompletedWords(): string[] {
        if (!this.buffer.trim()) {
            return [];
        }

        // Split on whitespace but preserve punctuation attached to words
        // This regex matches sequences of non-whitespace characters
        const matches = this.buffer.match(/\S+/g);

        if (!matches) {
            return [];
        }

        const words = [...matches];

        // If buffer ends with whitespace, all words are complete
        if (this.buffer.match(/\s$/)) {
            return words;
        }

        // If buffer doesn't end with whitespace, the last word might be incomplete
        // We need to be conservative and only include words we're confident are complete
        if (words.length > 0) {
            const lastWord = words[words.length - 1];

            // Only include the last word if it's clearly complete
            if (!this.isWordDefinitelyComplete(lastWord)) {
                words.pop();
            }
        }

        return words;
    }

    /**
     * Check if the stream is complete based on the token
     * @param token - The current token
     * @returns True if the stream is complete
     */
    isStreamComplete(token: string): boolean {
        // Common stream completion indicators
        if (token.includes('[DONE]') || token.includes('</stream>')) {
            return true;
        }

        // Empty token often indicates end of stream
        if (token === '') {
            return true;
        }

        // Check for other completion markers that might be used by Bedrock
        const completionMarkers = ['[END]', '<|endoftext|>', '\n\n---\n\n'];
        return completionMarkers.some(marker => token.includes(marker));
    }

    /**
     * Get all accumulated text so far
     * @returns The complete accumulated text
     */
    getAccumulatedText(): string {
        return this.buffer;
    }

    /**
     * Get all completed words so far
     * @returns Array of completed words
     */
    getCompletedWords(): string[] {
        return [...this.completedWords];
    }

    /**
     * Reset the accumulator state
     */
    reset(): void {
        this.buffer = '';
        this.completedWords = [];
        this.pendingTokens = [];
        this.isProcessingBatch = false;

        // Note: PerformanceOptimizer cleanup removed
    }

    /**
     * Check if a character typically ends a word
     * @param char - Character to check
     * @returns True if the character typically ends a word
     */
    private isWordEndingPunctuation(char: string): boolean {
        const wordEndingPunctuation = '.!?,:;)]}>"\'';
        return wordEndingPunctuation.includes(char);
    }

    /**
     * Determine if a word is definitely complete (conservative approach)
     * Only returns true for words we're absolutely certain are complete
     * @param word - Word to check
     * @returns True if the word is definitely complete
     */
    private isWordDefinitelyComplete(word: string): boolean {
        // Words ending with punctuation are definitely complete
        if (this.isWordEndingPunctuation(word[word.length - 1])) {
            return true;
        }

        // Common complete words that are definitely complete even without punctuation
        // Being very conservative - only include words that are unambiguous
        const definitelyCompleteWords = new Set([
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
            'after', 'above', 'below', 'between', 'among', 'an', 'is', 'are',
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
            'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
            'you', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'
        ]);

        // Only return true for words in our definite list
        return definitelyCompleteWords.has(word.toLowerCase());
    }
}