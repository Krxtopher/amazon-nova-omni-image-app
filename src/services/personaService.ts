import { sqliteService } from './sqliteService';
import type { CustomPersona, BuiltInPersona, Persona } from '../types';
import { STANDARD_PERSONAS } from './standardPersonas';

/**
 * Service for managing all personas (built-in and custom) with a unified interface
 */
class PersonaService {
    private readonly PERSONAS_KEY = 'customPersonas';

    /**
     * Built-in persona definitions from centralized source
     */
    readonly builtInPersonas = STANDARD_PERSONAS;

    /**
     * Get all personas (built-in and custom) as unified Persona objects
     */
    async getAllPersonas(): Promise<Persona[]> {
        const customPersonas = await this.getCustomPersonas();
        const builtInPersonasList = Object.values(this.builtInPersonas);

        return [...builtInPersonasList, ...customPersonas];
    }

    /**
     * Get a specific persona by ID (built-in or custom)
     */
    async getPersona(id: string): Promise<Persona | null> {
        // Check built-in personas first
        if (this.isBuiltInPersona(id)) {
            return this.builtInPersonas[id];
        }

        // Check custom personas
        return await this.getCustomPersona(id);
    }

    /**
     * Get all custom personas
     */
    async getCustomPersonas(): Promise<CustomPersona[]> {
        try {
            const personas = await sqliteService.getSetting(this.PERSONAS_KEY);
            const rawPersonas = personas ? JSON.parse(personas as string) : [];

            // Ensure all custom personas have isEditable: true and proper typing
            return rawPersonas.map((p: any): CustomPersona => ({
                ...p,
                isEditable: true,
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt)
            }));
        } catch (error) {
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
     * Create a new custom persona using the template
     */
    async createCustomPersona(name: string, personaDescription: string, description?: string, icon?: string): Promise<CustomPersona> {
        const personas = await this.getCustomPersonas();

        // Use the template with the user's persona description
        const systemPrompt = this.generateSystemPromptFromTemplate(personaDescription);

        const newPersona: CustomPersona = {
            id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: name.trim(),
            description: description?.trim() || 'Custom persona',
            systemPrompt: systemPrompt,
            icon: icon || 'Edit', // Default to Edit icon if none provided
            isEditable: true,
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
    async updateCustomPersona(id: string, updates: Partial<Pick<CustomPersona, 'name' | 'description' | 'icon'>> & { personaDescription?: string }): Promise<CustomPersona | null> {
        const personas = await this.getCustomPersonas();
        const index = personas.findIndex(p => p.id === id);

        if (index === -1) {
            return null;
        }

        // If personaDescription is provided, regenerate the system prompt
        const systemPromptUpdate = updates.personaDescription
            ? { systemPrompt: this.generateSystemPromptFromTemplate(updates.personaDescription) }
            : {};

        const updatedPersona: CustomPersona = {
            ...personas[index],
            ...updates,
            ...systemPromptUpdate,
            isEditable: true, // Ensure this remains true
            updatedAt: new Date()
        };

        // Remove personaDescription from the final object as it's not part of CustomPersona
        delete (updatedPersona as any).personaDescription;

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
        const persona = await this.getPersona(personaId);
        return persona?.systemPrompt || null;
    }

    /**
     * Get display information for any persona using unified interface
     */
    async getPersonaInfo(personaId: string): Promise<{ label: string; description: string } | null> {
        const persona = await this.getPersona(personaId);
        if (!persona) {
            return null;
        }

        return {
            label: persona.name,
            description: persona.description
        };
    }

    /**
     * Generate system prompt from template using persona description
     */
    private generateSystemPromptFromTemplate(personaDescription: string): string {
        return `You are a creative image creator with a unique artistic style. Your task is to take a user's image generation prompt and enhance it while preserving the original intent. People describe you as follows:

${personaDescription.trim()}

Take inspiration from the user's prompt and create your own unique vision. Be sure to include a description of your unique style in the prompt. Return only the enhanced prompt, nothing else. The prompt must start with "Create an image..."`;
    }

    /**
     * Extract persona description from existing system prompt
     * This is used when editing existing personas to show the original description
     */
    extractPersonaDescription(systemPrompt: string): string {
        // Try to extract the description between the template markers
        const match = systemPrompt.match(/People describe you as follows:\s*\n\n(.*?)\n\nTake inspiration from/s);
        if (match && match[1]) {
            return match[1].trim();
        }

        // Fallback: if it doesn't match the template, return the whole prompt
        // This handles legacy personas that might have been created with the old system
        return systemPrompt;
    }

    /**
     * Save personas to storage
     */
    private async savePersonas(personas: CustomPersona[]): Promise<void> {
        await sqliteService.setSetting(this.PERSONAS_KEY, JSON.stringify(personas));
    }
}

export const personaService = new PersonaService();