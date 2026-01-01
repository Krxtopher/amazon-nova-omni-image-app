import type { CustomPersona, BuiltInPersona, Persona } from '../types';
import { STANDARD_PERSONAS } from './standardPersonas';
import { processPromptTemplate } from '../utils/promptTemplating';
import { amplifyDataService } from './AmplifyDataService';

/**
 * Service for managing all personas (built-in and custom) with a unified interface
 * Now uses Amplify Data (DynamoDB) for cloud storage with user isolation
 */
class PersonaService {

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
     * Get all custom personas from Amplify Data (DynamoDB)
     * Requirements: 5.1, 5.2 - User-scoped persona storage
     */
    async getCustomPersonas(): Promise<CustomPersona[]> {
        try {
            const personaDataList = await amplifyDataService.listPersonaData();

            // Convert AmplifyPersonaData to CustomPersona format
            return personaDataList.map((personaData): CustomPersona => ({
                id: personaData.id,
                name: personaData.name,
                shortDescription: personaData.description || 'Custom persona',
                personaDescription: personaData.promptTemplate,
                icon: personaData.icon || 'Palette',
                isEditable: true,
                createdAt: new Date(personaData.createdAt),
                updatedAt: new Date(personaData.updatedAt)
            }));
        } catch (error) {
            console.error('Failed to load custom personas from cloud:', error);
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
     * Create a new custom persona using Amplify Data (DynamoDB)
     * Requirements: 5.1 - User-scoped persona creation
     */
    async createCustomPersona(name: string, personaDescription: string, description?: string, icon?: string): Promise<CustomPersona> {
        try {
            const personaData = await amplifyDataService.createPersonaData({
                name: name.trim(),
                description: description?.trim() || 'Custom persona',
                icon: icon || 'Palette',
                promptTemplate: personaDescription,
                isDefault: false
            });

            // Convert to CustomPersona format
            return {
                id: personaData.id,
                name: personaData.name,
                shortDescription: personaData.description || 'Custom persona',
                personaDescription: personaData.promptTemplate,
                icon: personaData.icon || 'Palette',
                isEditable: true,
                createdAt: new Date(personaData.createdAt),
                updatedAt: new Date(personaData.updatedAt)
            };
        } catch (error) {
            throw new Error(`Failed to create custom persona: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Update an existing custom persona using Amplify Data (DynamoDB)
     * Requirements: 5.3 - Persona modification consistency
     */
    async updateCustomPersona(id: string, updates: Partial<Pick<CustomPersona, 'name' | 'personaDescription' | 'icon'>>): Promise<CustomPersona | null> {
        try {
            // Prepare updates for Amplify Data format
            const amplifyUpdates: any = {};

            if (updates.name !== undefined) {
                amplifyUpdates.name = updates.name;
            }
            if (updates.personaDescription !== undefined) {
                amplifyUpdates.promptTemplate = updates.personaDescription;
            }
            if (updates.icon !== undefined) {
                amplifyUpdates.icon = updates.icon;
            }

            const updatedPersonaData = await amplifyDataService.updatePersonaData(id, amplifyUpdates);

            if (!updatedPersonaData) {
                return null;
            }

            // Convert back to CustomPersona format
            return {
                id: updatedPersonaData.id,
                name: updatedPersonaData.name,
                shortDescription: updatedPersonaData.description || 'Custom persona',
                personaDescription: updatedPersonaData.promptTemplate,
                icon: updatedPersonaData.icon || 'Palette',
                isEditable: true,
                createdAt: new Date(updatedPersonaData.createdAt),
                updatedAt: new Date(updatedPersonaData.updatedAt)
            };
        } catch (error) {
            throw new Error(`Failed to update custom persona: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Delete a custom persona using Amplify Data (DynamoDB)
     * Requirements: 5.4 - Persona deletion consistency
     */
    async deleteCustomPersona(id: string): Promise<boolean> {
        try {
            const success = await amplifyDataService.deletePersonaData(id);
            return success;
        } catch (error) {
            console.error('Failed to delete custom persona:', error);
            return false;
        }
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
            return 'Interpret all user messages as image generation requests. Never ask for clarification. Ambiguous requests are allowed.'
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

}

export const personaService = new PersonaService();