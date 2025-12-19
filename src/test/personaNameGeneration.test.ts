import { describe, it, expect } from 'vitest';
import { BedrockImageService } from '../services/BedrockImageService';

describe('Persona Name and Icon Generation', () => {
    const bedrockService = new BedrockImageService({
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
        }
    });

    describe('Name Generation', () => {
        it('should have generatePersonaName method', () => {
            expect(typeof bedrockService.generatePersonaName).toBe('function');
        });

        it('should throw error for empty persona description', async () => {
            await expect(bedrockService.generatePersonaName('')).rejects.toThrow(
                'Persona description is required for name generation'
            );

            await expect(bedrockService.generatePersonaName('   ')).rejects.toThrow(
                'Persona description is required for name generation'
            );
        });

        it('should validate input parameters correctly', () => {
            // Test that the method exists and can be called
            expect(() => {
                bedrockService.generatePersonaName('test description');
            }).not.toThrow();
        });
    });

    describe('Icon Generation', () => {
        it('should have generatePersonaIcon method', () => {
            expect(typeof bedrockService.generatePersonaIcon).toBe('function');
        });

        it('should throw error for empty persona description', async () => {
            await expect(bedrockService.generatePersonaIcon('')).rejects.toThrow(
                'Persona description is required for icon generation'
            );

            await expect(bedrockService.generatePersonaIcon('   ')).rejects.toThrow(
                'Persona description is required for icon generation'
            );
        });

        it('should validate input parameters correctly', () => {
            // Test that the method exists and can be called
            expect(() => {
                bedrockService.generatePersonaIcon('test description');
            }).not.toThrow();
        });
    });
});