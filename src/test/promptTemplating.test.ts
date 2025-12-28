import { describe, it, expect, vi } from 'vitest'
import { processPromptTemplate } from '../utils/promptTemplating'

describe('processPromptTemplate', () => {
    const artStyleTemplate = "choose {an illustration (non-watercolor)|a realistic|a contemporary art|a modern art|a classical art|a design|graphic|an experimental|a pop art} style or sub-style."

    describe('art style template variation', () => {
        it('should produce varied results when called multiple times', () => {
            const results = new Set<string>()
            const iterations = 100

            // Generate multiple results
            for (let i = 0; i < iterations; i++) {
                const result = processPromptTemplate(artStyleTemplate)
                results.add(result)
            }

            // Should have multiple unique results (at least 3 different ones out of 9 possible)
            expect(results.size).toBeGreaterThanOrEqual(3)

            // All results should follow the expected pattern
            results.forEach(result => {
                expect(result).toMatch(/^choose .+ style or sub-style\.$/)
            })
        })

        it('should contain all expected art style options', () => {
            const expectedOptions = [
                'an illustration (non-watercolor)',
                'a realistic',
                'a contemporary art',
                'a modern art',
                'a classical art',
                'a design',
                'graphic',
                'an experimental',
                'a pop art'
            ]

            const results = new Set<string>()
            const maxIterations = 1000

            // Keep generating until we find all options or hit max iterations
            for (let i = 0; i < maxIterations && results.size < expectedOptions.length; i++) {
                const result = processPromptTemplate(artStyleTemplate)
                results.add(result)
            }

            // Extract the art style from each result
            const foundStyles = new Set<string>()
            results.forEach(result => {
                const match = result.match(/^choose (.+) style or sub-style\.$/)
                if (match) {
                    foundStyles.add(match[1])
                }
            })

            // Should find all expected options
            expectedOptions.forEach(option => {
                expect(foundStyles).toContain(option)
            })
        })

        it('should be deterministic with fixed RNG', () => {
            const mockRng = vi.fn()
                .mockReturnValueOnce(0.1) // Should select first option (0.1 * 9 = 0.9, first option covers 0-1)
                .mockReturnValueOnce(0.3) // Should select third option (0.3 * 9 = 2.7, third option covers 2-3)
                .mockReturnValueOnce(0.8) // Should select eighth option (0.8 * 9 = 7.2, eighth option covers 7-8)

            const result1 = processPromptTemplate(artStyleTemplate, { rng: mockRng })
            const result2 = processPromptTemplate(artStyleTemplate, { rng: mockRng })
            const result3 = processPromptTemplate(artStyleTemplate, { rng: mockRng })

            expect(result1).toBe('choose an illustration (non-watercolor) style or sub-style.')
            expect(result2).toBe('choose a contemporary art style or sub-style.')
            expect(result3).toBe('choose an experimental style or sub-style.')
            expect(mockRng).toHaveBeenCalledTimes(3)
        })

        it('should handle edge case RNG values correctly', () => {
            // Test with RNG that returns exactly 0
            const result1 = processPromptTemplate(artStyleTemplate, { rng: () => 0 })
            expect(result1).toBe('choose an illustration (non-watercolor) style or sub-style.')

            // Test with RNG that returns close to 1 (but less than 1)
            const result2 = processPromptTemplate(artStyleTemplate, { rng: () => 0.9999 })
            expect(result2).toBe('choose a pop art style or sub-style.')
        })

        it('should produce statistically reasonable distribution', () => {
            const iterations = 1000
            const results: string[] = []

            for (let i = 0; i < iterations; i++) {
                results.push(processPromptTemplate(artStyleTemplate))
            }

            // Count occurrences of each option
            const counts = new Map<string, number>()
            results.forEach(result => {
                const match = result.match(/^choose (.+) style or sub-style\.$/)
                if (match) {
                    const style = match[1]
                    counts.set(style, (counts.get(style) || 0) + 1)
                }
            })

            // With 9 options and uniform distribution, each should appear roughly 111 times (1000/9)
            // Allow for reasonable variance (between 50 and 200 occurrences)
            counts.forEach((count, style) => {
                expect(count).toBeGreaterThan(50)
                expect(count).toBeLessThan(200)
            })

            // Should have exactly 9 different styles
            expect(counts.size).toBe(9)
        })
    })

    describe('general template functionality', () => {
        it('should handle simple choice groups', () => {
            const template = 'I like {cats|dogs|birds}'
            const results = new Set<string>()

            for (let i = 0; i < 50; i++) {
                results.add(processPromptTemplate(template))
            }

            expect(results.size).toBeGreaterThan(1)
            expect(Array.from(results)).toEqual(
                expect.arrayContaining([
                    'I like cats',
                    'I like dogs',
                    'I like birds'
                ])
            )
        })

        it('should handle weighted choices', () => {
            const template = '{heavy:10|light:1}'
            const results: string[] = []

            for (let i = 0; i < 100; i++) {
                results.push(processPromptTemplate(template))
            }

            const heavyCount = results.filter(r => r === 'heavy').length
            const lightCount = results.filter(r => r === 'light').length

            // Heavy should appear much more often than light (roughly 10:1 ratio)
            expect(heavyCount).toBeGreaterThan(lightCount * 5)
        })

        it('should handle probability-based choices', () => {
            const template = '{maybe:0.3}'
            const results: string[] = []

            for (let i = 0; i < 1000; i++) {
                results.push(processPromptTemplate(template))
            }

            const maybeCount = results.filter(r => r === 'maybe').length
            const emptyCount = results.filter(r => r === '').length

            // Should be roughly 30% "maybe" and 70% empty
            expect(maybeCount).toBeGreaterThan(200)
            expect(maybeCount).toBeLessThan(400)
            expect(emptyCount).toBeGreaterThan(600)
            expect(emptyCount).toBeLessThan(800)
        })

        it('should handle nested groups', () => {
            const template = 'Create a {red|blue} {circle|square}'
            const results = new Set<string>()

            for (let i = 0; i < 50; i++) {
                results.add(processPromptTemplate(template))
            }

            expect(results.size).toBeGreaterThan(1)
            expect(Array.from(results)).toEqual(
                expect.arrayContaining([
                    'Create a red circle',
                    'Create a red square',
                    'Create a blue circle',
                    'Create a blue square'
                ])
            )
        })

        it('should handle empty groups gracefully', () => {
            const template = 'Hello {}'
            const result = processPromptTemplate(template)
            expect(result).toBe('Hello {}') // Empty groups are left unchanged
        })

        it('should handle malformed weights in strict mode', () => {
            const template = '{option:invalid}'

            expect(() => {
                processPromptTemplate(template, { strictWeights: true })
            }).toThrow('Invalid weight "invalid" in option "option:invalid"')
        })

        it('should handle malformed weights in non-strict mode', () => {
            const template = '{option:invalid|other}'
            const result = processPromptTemplate(template, { strictWeights: false })

            // Should treat malformed weight as literal text
            expect(['option:invalid', 'other']).toContain(result)
        })
    })
})