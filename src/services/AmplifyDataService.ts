import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Generate the Amplify Data client
const client = generateClient<Schema>();

/**
 * ImageMetadata interface matching the Amplify schema
 */
export interface ImageMetadata {
    id: string;
    userId: string;
    prompt: string;
    enhancedPrompt?: string | null;
    aspectRatio?: string | null;
    s3Key: string;
    s3Url?: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * PersonaData interface matching the Amplify schema
 */
export interface PersonaData {
    id: string;
    userId: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    promptTemplate: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Input types for creating new records
 */
export interface CreateImageMetadataInput {
    prompt: string;
    enhancedPrompt?: string;
    aspectRatio?: string;
    s3Key: string;
    s3Url?: string;
}

export interface CreatePersonaDataInput {
    name: string;
    description?: string;
    icon?: string;
    promptTemplate: string;
    isDefault?: boolean;
}

/**
 * Update types for modifying existing records
 */
export interface UpdateImageMetadataInput {
    id: string;
    prompt?: string;
    enhancedPrompt?: string;
    aspectRatio?: string;
    s3Key?: string;
    s3Url?: string;
}

export interface UpdatePersonaDataInput {
    id: string;
    name?: string;
    description?: string;
    icon?: string;
    promptTemplate?: string;
    isDefault?: boolean;
}

/**
 * Service class for managing ImageMetadata and PersonaData through Amplify Data
 * Provides CRUD operations with user isolation enforced by Amplify's owner-based authorization
 */
export class AmplifyDataService {

    // ========== ImageMetadata Operations ==========

    /**
     * Create a new image metadata record
     * The userId will be automatically set by Amplify based on the authenticated user
     */
    async createImageMetadata(input: CreateImageMetadataInput): Promise<ImageMetadata> {
        try {
            const result = await client.models.ImageMetadata.create({
                userId: '', // This will be automatically set by Amplify owner authorization
                prompt: input.prompt,
                enhancedPrompt: input.enhancedPrompt || null,
                aspectRatio: input.aspectRatio || null,
                s3Key: input.s3Key,
                s3Url: input.s3Url || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            if (!result.data) {
                throw new Error('Failed to create image metadata');
            }

            return result.data as ImageMetadata;
        } catch (error) {
            console.error('Error creating image metadata:', error);
            throw new Error(`Failed to create image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get image metadata by ID
     * Only returns the record if it belongs to the authenticated user
     */
    async getImageMetadata(id: string): Promise<ImageMetadata | null> {
        try {
            const result = await client.models.ImageMetadata.get({ id });
            return result.data as ImageMetadata | null;
        } catch (error) {
            console.error('Error getting image metadata:', error);
            throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List all image metadata for the authenticated user
     * Returns only records that belong to the current user due to owner-based authorization
     */
    async listImageMetadata(): Promise<ImageMetadata[]> {
        try {
            const result = await client.models.ImageMetadata.list();
            return (result.data || []) as ImageMetadata[];
        } catch (error) {
            console.error('Error listing image metadata:', error);
            throw new Error(`Failed to list image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update image metadata
     * Only updates the record if it belongs to the authenticated user
     */
    async updateImageMetadata(input: UpdateImageMetadataInput): Promise<ImageMetadata> {
        try {
            const updateData: any = {
                id: input.id,
                updatedAt: new Date().toISOString(),
            };

            // Only include fields that are being updated
            if (input.prompt !== undefined) updateData.prompt = input.prompt;
            if (input.enhancedPrompt !== undefined) updateData.enhancedPrompt = input.enhancedPrompt;
            if (input.aspectRatio !== undefined) updateData.aspectRatio = input.aspectRatio;
            if (input.s3Key !== undefined) updateData.s3Key = input.s3Key;
            if (input.s3Url !== undefined) updateData.s3Url = input.s3Url;

            const result = await client.models.ImageMetadata.update(updateData);

            if (!result.data) {
                throw new Error('Failed to update image metadata');
            }

            return result.data as ImageMetadata;
        } catch (error) {
            console.error('Error updating image metadata:', error);
            throw new Error(`Failed to update image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete image metadata
     * Only deletes the record if it belongs to the authenticated user
     */
    async deleteImageMetadata(id: string): Promise<void> {
        try {
            const result = await client.models.ImageMetadata.delete({ id });

            if (!result.data) {
                throw new Error('Failed to delete image metadata');
            }
        } catch (error) {
            console.error('Error deleting image metadata:', error);
            throw new Error(`Failed to delete image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // ========== PersonaData Operations ==========

    /**
     * Create a new persona data record
     * The userId will be automatically set by Amplify based on the authenticated user
     */
    async createPersonaData(input: CreatePersonaDataInput): Promise<PersonaData> {
        try {
            const result = await client.models.PersonaData.create({
                userId: '', // This will be automatically set by Amplify owner authorization
                name: input.name,
                description: input.description || null,
                icon: input.icon || null,
                promptTemplate: input.promptTemplate,
                isDefault: input.isDefault || false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            if (!result.data) {
                throw new Error('Failed to create persona data');
            }

            return result.data as PersonaData;
        } catch (error) {
            console.error('Error creating persona data:', error);
            throw new Error(`Failed to create persona data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get persona data by ID
     * Only returns the record if it belongs to the authenticated user
     */
    async getPersonaData(id: string): Promise<PersonaData | null> {
        try {
            const result = await client.models.PersonaData.get({ id });
            return result.data as PersonaData | null;
        } catch (error) {
            console.error('Error getting persona data:', error);
            throw new Error(`Failed to get persona data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List all persona data for the authenticated user
     * Returns only records that belong to the current user due to owner-based authorization
     */
    async listPersonaData(): Promise<PersonaData[]> {
        try {
            const result = await client.models.PersonaData.list();
            return (result.data || []) as PersonaData[];
        } catch (error) {
            console.error('Error listing persona data:', error);
            throw new Error(`Failed to list persona data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update persona data
     * Only updates the record if it belongs to the authenticated user
     */
    async updatePersonaData(input: UpdatePersonaDataInput): Promise<PersonaData> {
        try {
            const updateData: any = {
                id: input.id,
                updatedAt: new Date().toISOString(),
            };

            // Only include fields that are being updated
            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.icon !== undefined) updateData.icon = input.icon;
            if (input.promptTemplate !== undefined) updateData.promptTemplate = input.promptTemplate;
            if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

            const result = await client.models.PersonaData.update(updateData);

            if (!result.data) {
                throw new Error('Failed to update persona data');
            }

            return result.data as PersonaData;
        } catch (error) {
            console.error('Error updating persona data:', error);
            throw new Error(`Failed to update persona data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete persona data
     * Only deletes the record if it belongs to the authenticated user
     */
    async deletePersonaData(id: string): Promise<void> {
        try {
            const result = await client.models.PersonaData.delete({ id });

            if (!result.data) {
                throw new Error('Failed to delete persona data');
            }
        } catch (error) {
            console.error('Error deleting persona data:', error);
            throw new Error(`Failed to delete persona data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // ========== Utility Methods ==========

    /**
     * Get the default persona for the authenticated user
     */
    async getDefaultPersona(): Promise<PersonaData | null> {
        try {
            const personas = await this.listPersonaData();
            return personas.find(persona => persona.isDefault) || null;
        } catch (error) {
            console.error('Error getting default persona:', error);
            throw new Error(`Failed to get default persona: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Set a persona as the default (and unset any other default)
     */
    async setDefaultPersona(personaId: string): Promise<PersonaData> {
        try {
            // First, get all personas to find the current default
            const personas = await this.listPersonaData();
            const currentDefault = personas.find(persona => persona.isDefault);

            // Unset the current default if it exists and is different
            if (currentDefault && currentDefault.id !== personaId) {
                await this.updatePersonaData({
                    id: currentDefault.id,
                    isDefault: false
                });
            }

            // Set the new default
            return await this.updatePersonaData({
                id: personaId,
                isDefault: true
            });
        } catch (error) {
            console.error('Error setting default persona:', error);
            throw new Error(`Failed to set default persona: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export a singleton instance
export const amplifyDataService = new AmplifyDataService();