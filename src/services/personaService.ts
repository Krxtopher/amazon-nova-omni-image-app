import { sqliteService } from './sqliteService';
import type { CustomPersona, BuiltInPersona, Persona } from '../types';
import { STANDARD_PERSONAS } from './standardPersonas';
import { processPromptTemplate } from '../utils/promptTemplating'

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
        const builtInPersonasList = [...this.builtInPersonas];

        return [...builtInPersonasList, ...customPersonas];
    }

    /**
     * Get a specific persona by ID (built-in or custom)
     */
    async getPersona(id: string): Promise<Persona | null> {
        // Check built-in personas first
        const builtInPersona = this.builtInPersonas.find(p => p.id === id);
        if (builtInPersona) {
            return builtInPersona;
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

        const newPersona: CustomPersona = {
            id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: name.trim(),
            shortDescription: description?.trim() || 'Custom persona',
            personaDescription: personaDescription,
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
    async updateCustomPersona(id: string, updates: Partial<Pick<CustomPersona, 'name' | 'description' | 'icon'>>): Promise<CustomPersona | null> {
        const personas = await this.getCustomPersonas();
        const index = personas.findIndex(p => p.id === id);

        if (index === -1) {
            return null;
        }

        const updatedPersona: CustomPersona = {
            ...personas[index],
            ...updates,
            isEditable: true, // Ensure this remains true
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
        return this.builtInPersonas.some(p => p.id === personaId);
    }

    /**
     * Get the system prompt for a persona (built-in or custom)
     */
    async getSystemPrompt(personaId: string): Promise<string | null> {
        const persona = await this.getPersona(personaId);
        if (!persona || persona.personaDescription == null) {
            // Use a generic system prompt.
            return 'Act as an image generation tool. Interpret any message the user provides as a request for an image as output.'
        }

        return this.generateSystemPromptFromTemplate(persona.personaDescription)
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
            description: persona.shortDescription
        };
    }

    /**
     * Generate system prompt from template using persona description
     */
    private generateSystemPromptFromTemplate(personaDescription: string): string {
        return `Your task is to take a user's image generation prompt and enhance it while preserving the original intent. People describe you as follows:

${processPromptTemplate(personaDescription.trim())}

Additional Requirements:
- The prompt must start with "Create an image of..."
- Details about the visual style or medium should appear early in the prompt
- Return only the enhanced prompt with no header or formatting`;
    }

    /**
     * Save personas to storage
     */
    private async savePersonas(personas: CustomPersona[]): Promise<void> {
        await sqliteService.setSetting(this.PERSONAS_KEY, JSON.stringify(personas));
    }
}

export const personaService = new PersonaService();