/**
 * Tests for WordByWordDisplayEngine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { WordByWordDisplayEngine, DEFAULT_WORD_DISPLAY_CONFIG } from './WordByWordDisplayEngine';
import type { WordDisplayConfig } from '../types/streaming';

describe('WordByWordDisplayEngine', () => {
    let engine: WordByWordDisplayEngine;
    let mockOnWordReveal: any;
    let mockOnComplete: any;

    beforeEach(() => {
        engine = new WordByWordDisplayEngine();
        mockOnWordReveal = vi.fn();
        mockOnComplete = vi.fn();
        vi.useFakeTimers();
    });

    afterEach(() => {
        engine.cleanup();
        vi.useRealTimers();
    });

    describe('startDisplay', () => {
        it('should display words one by one with delays', () => {
            // Use fixed delays to make test predictable
            const testConfig: WordDisplayConfig = {
                ...DEFAULT_WORD_DISPLAY_CONFIG,
                baseDelay: { min: 100, max: 100 }, // Fixed 100ms delay
                punctuationDelays: {},
            };

            const text = 'Hello world test';

            engine.startDisplay(text, testConfig, mockOnWordReveal, mockOnComplete);

            // Initially no words should be revealed
            expect(mockOnWordReveal).not.toHaveBeenCalled();
            expect(mockOnComplete).not.toHaveBeenCalled();

            // Fast forward time to trigger first word (100ms)
            vi.advanceTimersByTime(100);
            expect(mockOnWordReveal).toHaveBeenCalledTimes(1);

            const firstCall = mockOnWordReveal.mock.calls[0];
            expect(firstCall[0]).toMatchObject({
                text: 'Hello',
                isVisible: true,
                hasAnimated: true
            });
            expect(firstCall[1]).toBe(0); // index

            // Fast forward to trigger second word (another 100ms)
            vi.advanceTimersByTime(100);
            expect(mockOnWordReveal).toHaveBeenCalledTimes(2);

            // Fast forward to trigger third word (another 100ms)
            vi.advanceTimersByTime(100);
            expect(mockOnWordReveal).toHaveBeenCalledTimes(3);
            expect(mockOnComplete).toHaveBeenCalledTimes(1);
        });

        it('should handle empty text', () => {
            engine.startDisplay('', DEFAULT_WORD_DISPLAY_CONFIG, mockOnWordReveal, mockOnComplete);

            expect(mockOnComplete).toHaveBeenCalledTimes(1);
            expect(mockOnWordReveal).not.toHaveBeenCalled();
        });
    });

    describe('cancelDisplay', () => {
        it('should cancel active display and clean up timers', () => {
            engine.startDisplay('Hello world', DEFAULT_WORD_DISPLAY_CONFIG, mockOnWordReveal, mockOnComplete);

            // Cancel before any words are revealed
            engine.cancelDisplay();

            // Fast forward time - no words should be revealed
            vi.advanceTimersByTime(1000);
            expect(mockOnWordReveal).not.toHaveBeenCalled();
            expect(mockOnComplete).not.toHaveBeenCalled();
        });
    });

    describe('showInstantly', () => {
        it('should cancel active display and trigger completion', () => {
            engine.startDisplay('Hello world', DEFAULT_WORD_DISPLAY_CONFIG, mockOnWordReveal, mockOnComplete);

            // Show instantly should cancel and complete
            engine.showInstantly('Different text');

            expect(mockOnComplete).toHaveBeenCalledTimes(1);

            // Fast forward - no word reveals should happen
            vi.advanceTimersByTime(1000);
            expect(mockOnWordReveal).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should clean up all resources', () => {
            engine.startDisplay('Hello world', DEFAULT_WORD_DISPLAY_CONFIG, mockOnWordReveal, mockOnComplete);

            engine.cleanup();

            // Fast forward - nothing should happen
            vi.advanceTimersByTime(1000);
            expect(mockOnWordReveal).not.toHaveBeenCalled();
            expect(mockOnComplete).not.toHaveBeenCalled();
        });
    });

    describe('Property-Based Tests', () => {
        /**
         * **Property 21: Instant display skips animations**
         * **Validates: Requirements 7.5**
         */
        it('should skip fade-in effects and show all text immediately when displaying instantly', async () => {
            await fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                    fc.record({
                        baseDelay: fc.record({
                            min: fc.integer({ min: 50, max: 100 }),
                            max: fc.integer({ min: 100, max: 200 })
                        }),
                        fadeInDuration: fc.record({
                            min: fc.integer({ min: 100, max: 200 }),
                            max: fc.integer({ min: 200, max: 300 })
                        })
                    }),
                    (text, configOverrides) => {
                        const config: WordDisplayConfig = {
                            ...DEFAULT_WORD_DISPLAY_CONFIG,
                            ...configOverrides
                        };

                        const mockOnWordReveal = vi.fn();
                        const mockOnComplete = vi.fn();

                        // Start normal display first
                        engine.startDisplay(text, config, mockOnWordReveal, mockOnComplete);

                        // Call showInstantly - this should skip all animations
                        engine.showInstantly(text);

                        // Verify completion was called immediately
                        expect(mockOnComplete).toHaveBeenCalledTimes(1);

                        // Advance time significantly - no word reveals should happen
                        // because showInstantly should have cancelled the display
                        vi.advanceTimersByTime(10000);

                        // No word reveals should have been called since showInstantly cancels the display
                        expect(mockOnWordReveal).not.toHaveBeenCalled();

                        // Reset for next iteration
                        engine.cleanup();
                        vi.clearAllMocks();
                    }
                )
            );
        });
    });
});