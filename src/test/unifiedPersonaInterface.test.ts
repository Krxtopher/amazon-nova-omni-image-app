import { describe, it, expect, beforeEach, vi } from 'vitest';
import { personaService } from '../services/personaService';
import type { Persona, CustomPersona } from '../types';

// Mock the sqliteService
vi.mock('../services/sqliteService', () => ({
    sqliteService: {
        getSetting: vi.fn(),
        setSetting: vi.fn()
    }
}));

describe('Unified Persona Interface', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Built-in Personas', () => {
        it('should have isEditable: false for all built-in personas', () => {
            const builtInPersonas = personaService.builtInPersonas;

            builtInPersonas.forEach(persona => {
                expect(persona.isEditable).toBe(false);

                // Only 'off' persona should have null systemPrompt
                if (persona.id === 'off') {
                    expect(persona.personaDescription).toBeNull();
                } else {
                    // 'standard' and 'creative' should have actual system prompts
                    expect(persona.personaDescription).toBeTruthy();
                    expect(typeof persona.personaDescription).toBe('string');
                }
            });
        });

        it('should have correct structure for built-in personas', () => {
            const offPersona = personaService.builtInPersonas.find(p => p.id === 'off');

            expect(offPersona).toMatchObject({
                id: 'off',
                name: 'Off',
                shortDescription: 'Use your prompt as-is without a persona',
                personaDescription: null,
                icon: 'X',
                isEditable: false,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            });
        });

        it('should have persona descriptions stored directly in persona objects', () => {
            const standardPersona = personaService.builtInPersonas.find(p => p.id === 'standard');
            const creativePersona = personaService.builtInPersonas.find(p => p.id === 'creative');
            const photographerPersona = personaService.builtInPersonas.find(p => p.id === 'photographer');
            const offPersona = personaService.builtInPersonas.find(p => p.id === 'off');

            // Standard persona should have its persona description
            expect(standardPersona?.personaDescription).toBeTruthy();
            expect(standardPersona?.personaDescription).toContain('You improve user prompts');

            // Creative persona should have its persona description
            expect(creativePersona?.personaDescription).toBeTruthy();
            expect(creativePersona?.personaDescription).toContain('artistic persona');

            // Photographer persona should have its persona description
            expect(photographerPersona?.personaDescription).toBeTruthy();
            expect(photographerPersona?.personaDescription).toContain('professional photographer persona');

            // Off persona should have null persona description
            expect(offPersona?.personaDescription).toBeNull();
        });
    });

    describe('getAllPersonas', () => {
        it('should return both built-in and custom personas', async () => {
            const mockCustomPersonas = [{
                id: 'custom-123',
                name: 'Test Artist',
                shortDescription: 'Test description',
                personaDescription: 'Test prompt',
                icon: 'Palette',
                createdAt: new Date(),
                updatedAt: new Date()
            }];

            const { sqliteService } = await import('../services/sqliteService');
            (sqliteService.getSetting as any).mockResolvedValue(JSON.stringify(mockCustomPersonas));

            const allPersonas = await personaService.getAllPersonas();

            // Should have 4 built-in + 1 custom = 5 total
            expect(allPersonas).toHaveLength(5);

            // Check built-in personas are included
            const builtInIds = ['off', 'standard', 'creative', 'photographer'];
            builtInIds.forEach(id => {
                expect(allPersonas.find(p => p.id === id)).toBeDefined();
            });

            // Check custom persona is included and has isEditable: true
            const customPersona = allPersonas.find(p => p.id === 'custom-123') as CustomPersona;
            expect(customPersona).toBeDefined();
            expect(customPersona.isEditable).toBe(true);
            expect(customPersona.personaDescription).toBe('Test prompt');
        });
    });

    describe('getPersona', () => {
        it('should return built-in persona by id', async () => {
            const persona = await personaService.getPersona('off');

            expect(persona).toMatchObject({
                id: 'off',
                name: 'Off',
                isEditable: false
            });
        });

        it('should return custom persona by id', async () => {
            const mockCustomPersonas = [{
                id: 'custom-123',
                name: 'Test Artist',
                shortDescription: 'Test description',
                personaDescription: 'Test prompt',
                icon: 'Palette',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }];

            const { sqliteService } = await import('../services/sqliteService');
            (sqliteService.getSetting as any).mockResolvedValue(JSON.stringify(mockCustomPersonas));

            const persona = await personaService.getPersona('custom-123') as CustomPersona;

            expect(persona).toBeDefined();
            expect(persona.id).toBe('custom-123');
            expect(persona.isEditable).toBe(true);
            expect(persona.personaDescription).toBe('Test prompt');
        });

        it('should return null for non-existent persona', async () => {
            const { sqliteService } = await import('../services/sqliteService');
            (sqliteService.getSetting as any).mockResolvedValue('[]');

            const persona = await personaService.getPersona('non-existent');
            expect(persona).toBeNull();
        });
    });

    describe('Type Safety', () => {
        it('should ensure CustomPersona extends Persona with correct constraints', () => {
            // This is a compile-time test - if it compiles, the types are correct
            const customPersona: CustomPersona = {
                id: 'test',
                name: 'Test',
                shortDescription: 'Test desc',
                personaDescription: 'Test prompt', // Required for CustomPersona
                icon: 'Edit',
                isEditable: true, // Must be true for CustomPersona
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Verify the persona can be used as a Persona
            const persona: Persona = customPersona;
            expect(persona.isEditable).toBe(true);
        });
    });
});