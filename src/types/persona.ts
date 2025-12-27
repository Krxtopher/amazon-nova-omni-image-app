import type { STANDARD_PERSONAS } from '../services/standardPersonas';

/**
 * Unified persona interface for both built-in and custom personas
 */
export interface Persona {
    id: string;
    name: string;
    shortDescription: string;
    personaDescription: string | null; // null for built-in personas handled by BedrockImageService
    icon: string; // Lucide React icon name
    isEditable: boolean; // true for custom personas, false for built-in
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Custom persona definition (extends Persona with editable = true)
 */
export interface CustomPersona extends Persona {
    isEditable: true;
    personaDescription: string; // Custom personas always have system prompts
}

/**
 * Built-in persona types - derived from the STANDARD_PERSONAS array
 */
export type BuiltInPersona = typeof STANDARD_PERSONAS[number]['id'];

/**
 * Enhanced prompt enhancement type that supports custom persona IDs
 */
export type PromptEnhancement = BuiltInPersona | string; // string for custom persona IDs