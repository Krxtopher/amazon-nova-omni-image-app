import { sqliteService } from './sqliteService';
import type { CustomPersona, BuiltInPersona } from '../types';

/**
 * Service for managing custom personas
 */
class PersonaService {
    private readonly PERSONAS_KEY = 'customPersonas';

    /**
     * Built-in persona definitions
     */
    readonly builtInPersonas = {
        off: {
            label: 'Off',
            description: 'Use your prompt as-is without a persona'
        },
        standard: {
            label: 'Standard',
            description: 'Professional photographer persona with technical expertise'
        },
        creative: {
            label: 'Creative',
            description: 'Artistic persona that adds creative flair and imagination'
        }
    } as const;

    /**
     * Get all custom personas
     */
    async getCustomPersonas(): Promise<CustomPersona[]> {
        try {
            const personas = await sqliteService.getSetting(this.PERSONAS_KEY);
            return personas ? JSON.parse(personas as string) : [];
        } catch (error) {
            console.error('Failed to load custom personas:', error);
            return [];
        }
    }

    /**
     * Get a specific custom persona by ID
     */
    async getCustomPersona(id: string): Promise<CustomPersona | null> {
        const personas = await this.getCustomPersonas();
        return personas.find(p => p.id === id) || null;
    }

    /**
     * Create a new custom persona
     */
    async createCustomPersona(name: string, systemPrompt: string, description?: string): Promise<CustomPersona> {
        const personas = await this.getCustomPersonas();

        const newPersona: CustomPersona = {
            id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: name.trim(),
            description: description?.trim() || 'Custom persona',
            systemPrompt: systemPrompt.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        personas.push(newPersona);
        await this.savePersonas(personas);

        return newPersona;
    }

    /**
     * Update an existing custom persona
     */
    async updateCustomPersona(id: string, updates: Partial<Pick<CustomPersona, 'name' | 'description' | 'systemPrompt'>>): Promise<CustomPersona | null> {
        const personas = await this.getCustomPersonas();
        const index = personas.findIndex(p => p.id === id);

        if (index === -1) {
            return null;
        }

        const updatedPersona = {
            ...personas[index],
            ...updates,
            updatedAt: new Date()
        };

        personas[index] = updatedPersona;
        await this.savePersonas(personas);

        return updatedPersona;
    }

    /**
     * Delete a custom persona
     */
    async deleteCustomPersona(id: string): Promise<boolean> {
        const personas = await this.getCustomPersonas();
        const filteredPersonas = personas.filter(p => p.id !== id);

        if (filteredPersonas.length === personas.length) {
            return false; // Persona not found
        }

        await this.savePersonas(filteredPersonas);
        return true;
    }

    /**
     * Check if a persona ID is a built-in persona
     */
    isBuiltInPersona(personaId: string): personaId is BuiltInPersona {
        return personaId in this.builtInPersonas;
    }

    /**
     * Get the system prompt for a persona (built-in or custom)
     */
    async getSystemPrompt(personaId: string): Promise<string | null> {
        if (this.isBuiltInPersona(personaId)) {
            // Return null for built-in personas - they're handled by BedrockImageService
            return null;
        }

        const persona = await this.getCustomPersona(personaId);
        return persona?.systemPrompt || null;
    }

    /**
     * Get display information for any persona
     */
    async getPersonaInfo(personaId: string): Promise<{ label: string; description: string } | null> {
        if (this.isBuiltInPersona(personaId)) {
            return this.builtInPersonas[personaId];
        }

        const persona = await this.getCustomPersona(personaId);
        if (!persona) {
            return null;
        }

        return {
            label: persona.name,
            description: persona.description
        };
    }

    /**
     * Save personas to storage
     */
    private async savePersonas(personas: CustomPersona[]): Promise<void> {
        await sqliteService.setSetting(this.PERSONAS_KEY, JSON.stringify(personas));
    }

    /**
     * Migrate old single custom persona to new system
     */
    async migrateOldCustomPersona(): Promise<void> {
        try {
            const oldPersona = await sqliteService.getSetting('customPromptEnhancementPersona');
            if (!oldPersona) {
                return; // No old persona to migrate
            }

            const existingPersonas = await this.getCustomPersonas();
            if (existingPersonas.length > 0) {
                return; // Already migrated or has new personas
            }

            // Create a new persona from the old one
            await this.createCustomPersona(
                'My Custom Persona',
                oldPersona as string,
                'Migrated from previous custom persona'
            );

            // Remove the old setting
            await sqliteService.deleteSetting('customPromptEnhancementPersona');
        } catch (error) {
            console.error('Failed to migrate old custom persona:', error);
        }
    }
}

export const personaService = new PersonaService();