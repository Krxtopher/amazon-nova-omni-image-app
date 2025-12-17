/**
 * Custom persona definition
 */
export interface CustomPersona {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Built-in persona types
 */
export type BuiltInPersona = 'off' | 'standard' | 'creative';

/**
 * Enhanced prompt enhancement type that supports custom persona IDs
 */
export type PromptEnhancement = BuiltInPersona | string; // string for custom persona IDs