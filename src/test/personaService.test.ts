import { describe, it, expect, beforeEach, vi } from 'vitest';
import { personaService } from '../services/personaService';
import { sqliteService } from '../services/sqliteService';

// Mock sqliteService
vi.mock('../services/sqliteService', () => ({
    sqliteService: {
        getSetting: vi.fn(),
        setSetting: vi.fn(),
        deleteSetting: vi.fn()
    }
}));

describe('PersonaService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Built-in personas', () => {
        it('should identify built-in personas correctly', () => {
            expect(personaService.isBuiltInPersona('off')).toBe(true);
            expect(personaService.isBuiltInPersona('standard')).toBe(true);
            expect(personaService.isBuiltInPersona('creative')).toBe(true);
            expect(personaService.isBuiltInPersona('custom-123')).toBe(false);
        });

        it('should return generated system prompt for built-in personas', async () => {
            const systemPrompt = await personaService.getSystemPrompt('standard');
            expect(systemPrompt).toContain('You are an AI image generation expert');
            expect(systemPrompt).toContain('Create a/an...');
        });

        it('should return correct info for built-in personas', async () => {
            const info = await personaService.getPersonaInfo('standard');
            expect(info).toEqual({
                label: 'General Enhancement',
                description: 'Offers basic prompt enhancement'
            });
        });
    });

    describe('Custom personas', () => {
        it('should create a new custom persona using template', async () => {
            vi.mocked(sqliteService.getSetting).mockResolvedValue('[]');
            vi.mocked(sqliteService.setSetting).mockResolvedValue();

            const persona = await personaService.createCustomPersona(
                'Test Persona',
                'a test persona with unique characteristics',
                'A test persona'
            );

            expect(persona.name).toBe('Test Persona');
            expect(persona.shortDescription).toBe('A test persona');
            expect(persona.personaDescription).toBe('a test persona with unique characteristics');
            expect(persona.id).toMatch(/^custom-/);
            expect(sqliteService.setSetting).toHaveBeenCalled();
        });

        it('should get custom personas from storage', async () => {
            const mockPersonas = [{
                id: 'custom-123',
                name: 'Test',
                shortDescription: 'Test persona',
                personaDescription: 'Test description',
                icon: 'Edit',
                createdAt: new Date(),
                updatedAt: new Date()
            }];

            vi.mocked(sqliteService.getSetting).mockResolvedValue(JSON.stringify(mockPersonas));

            const personas = await personaService.getCustomPersonas();
            expect(personas).toHaveLength(1);
            expect(personas[0].name).toBe('Test');
        });

        it('should return system prompt for custom persona', async () => {
            const mockPersonas = [{
                id: 'custom-123',
                name: 'Test',
                shortDescription: 'Test persona',
                personaDescription: 'You are a test persona',
                createdAt: new Date(),
                updatedAt: new Date()
            }];

            vi.mocked(sqliteService.getSetting).mockResolvedValue(JSON.stringify(mockPersonas));

            const systemPrompt = await personaService.getSystemPrompt('custom-123');
            expect(systemPrompt).toContain('You are an AI image generation expert');
            expect(systemPrompt).toContain('You are a test persona');
        });

        it('should delete a custom persona', async () => {
            const mockPersonas = [
                {
                    id: 'custom-123',
                    name: 'Test 1',
                    shortDescription: 'Test persona 1',
                    personaDescription: 'You are test 1',
                    icon: 'Edit',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'custom-456',
                    name: 'Test 2',
                    shortDescription: 'Test persona 2',
                    personaDescription: 'You are test 2',
                    icon: 'Edit',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            vi.mocked(sqliteService.getSetting).mockResolvedValue(JSON.stringify(mockPersonas));
            vi.mocked(sqliteService.setSetting).mockResolvedValue();

            const result = await personaService.deleteCustomPersona('custom-123');
            expect(result).toBe(true);

            // Verify the remaining persona was saved
            const savedCall = vi.mocked(sqliteService.setSetting).mock.calls[0];
            const savedPersonas = JSON.parse(savedCall[1] as string);
            expect(savedPersonas).toHaveLength(1);
            expect(savedPersonas[0].id).toBe('custom-456');
        });
    });
});