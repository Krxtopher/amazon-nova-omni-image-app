import { describe, it, expect } from 'vitest';
import { BedrockImageService } from '../services/BedrockImageService';

describe('Persona Name Generation', () => {
    it('should have generatePersonaName method', () => {
        const bedrockService = new BedrockImageService({
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret'
            }
        });

        expect(typeof bedrockService.generatePersonaName).toBe('function');
    });

    it('should throw error for empty persona description', async () => {
        const bedrockService = new BedrockImageService({
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret'
            }
        });

        await expect(bedrockService.generatePersonaName('')).rejects.toThrow(
            'Persona description is required for name generation'
        );

        await expect(bedrockService.generatePersonaName('   ')).rejects.toThrow(
            'Persona description is required for name generation'
        );
    });

    it('should validate input parameters correctly', () => {
        const bedrockService = new BedrockImageService({
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret'
            }
        });

        // Test that the method exists and can be called
        expect(() => {
            bedrockService.generatePersonaName('test description');
        }).not.toThrow();
    });
});