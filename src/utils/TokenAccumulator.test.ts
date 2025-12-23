import { describe, it, expect, beforeEach } from 'vitest';
import { TokenAccumulator } from './TokenAccumulator';

describe('TokenAccumulator', () => {
    let accumulator: TokenAccumulator;

    beforeEach(() => {
        accumulator = new TokenAccumulator();
    });

    describe('Basic Token Accumulation', () => {
        it('should accumulate simple tokens into words', () => {
            const result1 = accumulator.addToken('Hello ');
            expect(result1.newWords).toEqual(['Hello']);
            expect(result1.isComplete).toBe(false);

            const result2 = accumulator.addToken('world!');
            expect(result2.newWords).toEqual(['world!']);
            expect(result2.isComplete).toBe(false);
        });

        it('should handle partial words correctly', () => {
            const result1 = accumulator.addToken('Hel');
            expect(result1.newWords).toEqual([]);
            expect(result1.isComplete).toBe(false);

            const result2 = accumulator.addToken('lo ');
            expect(result2.newWords).toEqual(['Hello']);
            expect(result2.isComplete).toBe(false);
        });

        it('should handle multiple words in a single token', () => {
            const result = accumulator.addToken('Hello world amazing ');
            expect(result.newWords).toEqual(['Hello', 'world', 'amazing']);
            expect(result.isComplete).toBe(false);
        });

        it('should handle empty tokens', () => {
            const result = accumulator.addToken('');
            expect(result.newWords).toEqual([]);
            expect(result.isComplete).toBe(true); // Empty token indicates completion
        });
    });

    describe('Punctuation Handling', () => {
        it('should handle words with punctuation', () => {
            const result1 = accumulator.addToken('Hello, ');
            expect(result1.newWords).toEqual(['Hello,']);

            const result2 = accumulator.addToken('world! ');
            expect(result2.newWords).toEqual(['world!']);

            const result3 = accumulator.addToken('How ');
            expect(result3.newWords).toEqual(['How']);

            const result4 = accumulator.addToken('are ');
            expect(result4.newWords).toEqual(['are']);

            const result5 = accumulator.addToken('you? ');
            expect(result5.newWords).toEqual(['you?']);
        });

        it('should handle various punctuation marks', () => {
            const punctuationTests = [
                { token: 'word. ', expected: 'word.' },
                { token: 'word! ', expected: 'word!' },
                { token: 'word? ', expected: 'word?' },
                { token: 'word, ', expected: 'word,' },
                { token: 'word; ', expected: 'word;' },
                { token: 'word: ', expected: 'word:' },
            ];

            punctuationTests.forEach(({ token, expected }) => {
                const testAccumulator = new TokenAccumulator();
                const result = testAccumulator.addToken(token);
                expect(result.newWords).toEqual([expected]);
            });
        });

        it('should handle quotation marks and brackets', () => {
            const result1 = accumulator.addToken('"Hello" ');
            expect(result1.newWords).toEqual(['"Hello"']);

            const result2 = accumulator.addToken('(world) ');
            expect(result2.newWords).toEqual(['(world)']);

            const result3 = accumulator.addToken('[test] ');
            expect(result3.newWords).toEqual(['[test]']);
        });
    });

    describe('Whitespace Handling', () => {
        it('should handle multiple spaces', () => {
            const result = accumulator.addToken('word1   word2 ');
            expect(result.newWords).toEqual(['word1', 'word2']);
        });

        it('should handle tabs and newlines', () => {
            const result = accumulator.addToken('word1\t\nword2 ');
            expect(result.newWords).toEqual(['word1', 'word2']);
        });

        it('should ignore leading whitespace', () => {
            const result = accumulator.addToken('   hello ');
            expect(result.newWords).toEqual(['hello']);
        });

        it('should handle only whitespace tokens', () => {
            const result = accumulator.addToken('   ');
            expect(result.newWords).toEqual([]);
            expect(result.isComplete).toBe(false);
        });
    });

    describe('Stream Completion Detection', () => {
        it('should detect [DONE] completion marker', () => {
            const result = accumulator.addToken('[DONE]');
            expect(result.isComplete).toBe(true);
        });

        it('should detect </stream> completion marker', () => {
            const result = accumulator.addToken('</stream>');
            expect(result.isComplete).toBe(true);
        });

        it('should detect [END] completion marker', () => {
            const result = accumulator.addToken('[END]');
            expect(result.isComplete).toBe(true);
        });

        it('should detect empty token as completion', () => {
            const result = accumulator.addToken('');
            expect(result.isComplete).toBe(true);
        });

        it('should detect completion markers within text', () => {
            const result = accumulator.addToken('Some text [DONE] more text');
            expect(result.isComplete).toBe(true);
        });

        it('should not detect completion for normal text', () => {
            const result = accumulator.addToken('normal text');
            expect(result.isComplete).toBe(false);
        });
    });

    describe('Word Boundary Detection', () => {
        it('should handle incomplete words at buffer end', () => {
            const result1 = accumulator.addToken('Hello wor');
            expect(result1.newWords).toEqual(['Hello']);

            const result2 = accumulator.addToken('ld ');
            expect(result2.newWords).toEqual(['world']);
        });

        it('should handle common complete words', () => {
            const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'];

            commonWords.forEach(word => {
                const testAccumulator = new TokenAccumulator();
                const result = testAccumulator.addToken(word);
                // Common words should be recognized as complete even without trailing space
                expect(result.newWords).toEqual([word]);
            });
        });

        it('should handle words ending with punctuation as complete', () => {
            const result1 = accumulator.addToken('Hello.');
            expect(result1.newWords).toEqual(['Hello.']);

            const result2 = accumulator.addToken(' World!');
            expect(result2.newWords).toEqual(['World!']);
        });
    });

    describe('State Management', () => {
        it('should track accumulated text correctly', () => {
            accumulator.addToken('Hello ');
            accumulator.addToken('world!');

            expect(accumulator.getAccumulatedText()).toBe('Hello world!');
        });

        it('should track completed words correctly', () => {
            accumulator.addToken('Hello ');
            accumulator.addToken('world ');
            accumulator.addToken('test');

            const completedWords = accumulator.getCompletedWords();
            expect(completedWords).toEqual(['Hello', 'world']);
        });

        it('should reset state correctly', () => {
            accumulator.addToken('Hello world ');
            accumulator.reset();

            expect(accumulator.getAccumulatedText()).toBe('');
            expect(accumulator.getCompletedWords()).toEqual([]);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle mixed punctuation and partial words', () => {
            const result1 = accumulator.addToken('Hello, my na');
            expect(result1.newWords).toEqual(['Hello,', 'my']);

            const result2 = accumulator.addToken('me is ');
            expect(result2.newWords).toEqual(['name', 'is']);

            const result3 = accumulator.addToken('John. ');
            expect(result3.newWords).toEqual(['John.']);
        });

        it('should handle rapid token accumulation', () => {
            const tokens = ['H', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd', '!'];
            let allNewWords: string[] = [];

            tokens.forEach(token => {
                const result = accumulator.addToken(token);
                allNewWords = allNewWords.concat(result.newWords);
            });

            expect(allNewWords).toEqual(['Hello', 'world!']);
            expect(accumulator.getAccumulatedText()).toBe('Hello world!');
        });

        it('should handle contractions and apostrophes', () => {
            const result1 = accumulator.addToken("I'm ");
            expect(result1.newWords).toEqual(["I'm"]);

            const result2 = accumulator.addToken("can't ");
            expect(result2.newWords).toEqual(["can't"]);

            const result3 = accumulator.addToken("won't ");
            expect(result3.newWords).toEqual(["won't"]);
        });

        it('should handle numbers and special characters', () => {
            const result1 = accumulator.addToken('The ');
            expect(result1.newWords).toEqual(['The']);

            const result2 = accumulator.addToken('price ');
            expect(result2.newWords).toEqual(['price']);

            const result3 = accumulator.addToken('is ');
            expect(result3.newWords).toEqual(['is']);

            const result4 = accumulator.addToken('$29.99 ');
            expect(result4.newWords).toEqual(['$29.99']);
        });

        it('should handle URLs and email addresses', () => {
            const result1 = accumulator.addToken('Visit ');
            expect(result1.newWords).toEqual(['Visit']);

            const result2 = accumulator.addToken('https://example.com ');
            expect(result2.newWords).toEqual(['https://example.com']);

            const result3 = accumulator.addToken('or ');
            expect(result3.newWords).toEqual(['or']);

            const result4 = accumulator.addToken('email ');
            expect(result4.newWords).toEqual(['email']);

            const result5 = accumulator.addToken('test@example.com ');
            expect(result5.newWords).toEqual(['test@example.com']);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long words', () => {
            const longWord = 'supercalifragilisticexpialidocious';
            const result = accumulator.addToken(longWord + ' ');
            expect(result.newWords).toEqual([longWord]);
        });

        it('should handle unicode characters', () => {
            const result1 = accumulator.addToken('Hello ');
            expect(result1.newWords).toEqual(['Hello']);

            const result2 = accumulator.addToken('世界 ');
            expect(result2.newWords).toEqual(['世界']);

            const result3 = accumulator.addToken('🌍 ');
            expect(result3.newWords).toEqual(['🌍']);
        });

        it('should handle repeated punctuation', () => {
            const result1 = accumulator.addToken('What??? ');
            expect(result1.newWords).toEqual(['What???']);

            const result2 = accumulator.addToken('Really!!! ');
            expect(result2.newWords).toEqual(['Really!!!']);
        });

        it('should handle mixed case and numbers', () => {
            const result = accumulator.addToken('iPhone15Pro ');
            expect(result.newWords).toEqual(['iPhone15Pro']);
        });
    });
});