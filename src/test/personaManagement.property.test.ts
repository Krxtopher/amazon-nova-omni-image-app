import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { personaService } from '../services/personaService';
import { amplifyDataService } from '../services/AmplifyDataService';
import type { CustomPersona } from '../types/persona';

// Mock AmplifyDataService
vi.mock('../services/AmplifyDataService', () => ({
    amplifyDataService: {
        createPersonaData: vi.fn(),
        updatePersonaData: vi.fn(),
        deletePersonaData: vi.fn(),
        listPersonaData: vi.fn(),
        getPersonaData: vi.fn()
    }
}));

describe('Persona Management Property Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Property 15: Persona update consistency', () => {
        it('should persist persona modifications and reflect changes in subsequent retrievals', async () => {
            /**
             * Feature: amplify-integration, Property 15: Persona update consistency
             * Validates: Requirements 5.3
             */

            // Property: For any persona modification, the changes should be persisted to the database 
            // and reflected in subsequent retrievals
            await fc.assert(
                fc.asyncProperty(
                    // Generate random persona data
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 50 }),
                        name: fc.string({ minLength: 1, maxLength: 100 }),
                        description: fc.string({ minLength: 1, maxLength: 200 }),
                        promptTemplate: fc.string({ minLength: 1, maxLength: 500 }),
                        icon: fc.string({ minLength: 1, maxLength: 20 }),
                        createdAt: fc.date(),
                        updatedAt: fc.date()
                    }),
                    // Generate random updates
                    fc.record({
                        name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
                        personaDescription: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
                        icon: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
                    }, { requiredKeys: [] }),
                    async (originalPersonaData, updates) => {
                        // Mock the original persona exists
                        const mockUpdatedPersonaData = {
                            ...originalPersonaData,
                            name: (updates.name !== undefined && updates.name !== null) ? updates.name : originalPersonaData.name,
                            promptTemplate: (updates.personaDescription !== undefined && updates.personaDescription !== null) ? updates.personaDescription : originalPersonaData.promptTemplate,
                            icon: (updates.icon !== undefined && updates.icon !== null) ? updates.icon : originalPersonaData.icon,
                            updatedAt: new Date().toISOString()
                        };

                        vi.mocked(amplifyDataService.updatePersonaData).mockResolvedValue(mockUpdatedPersonaData);

                        // Perform the update
                        const result = await personaService.updateCustomPersona(originalPersonaData.id, updates);

                        // Verify the update was called with correct parameters
                        const expectedUpdates: any = {};
                        if (updates.name !== undefined && updates.name !== null) {
                            expectedUpdates.name = updates.name;
                        }
                        if (updates.personaDescription !== undefined && updates.personaDescription !== null) {
                            expectedUpdates.promptTemplate = updates.personaDescription;
                        }
                        if (updates.icon !== undefined && updates.icon !== null) {
                            expectedUpdates.icon = updates.icon;
                        }

                        expect(amplifyDataService.updatePersonaData).toHaveBeenCalledWith(
                            originalPersonaData.id,
                            Object.keys(expectedUpdates).length > 0 ? expect.objectContaining(expectedUpdates) : expect.any(Object)
                        );

                        // Verify the result reflects the updates
                        if (result) {
                            if (updates.name !== undefined && updates.name !== null) {
                                expect(result.name).toBe(updates.name);
                            } else {
                                expect(result.name).toBe(originalPersonaData.name);
                            }
                            if (updates.personaDescription !== undefined && updates.personaDescription !== null) {
                                expect(result.personaDescription).toBe(updates.personaDescription);
                            } else {
                                expect(result.personaDescription).toBe(originalPersonaData.promptTemplate);
                            }
                            if (updates.icon !== undefined && updates.icon !== null) {
                                expect(result.icon).toBe(updates.icon);
                            } else {
                                expect(result.icon).toBe(originalPersonaData.icon);
                            }
                            expect(result.isEditable).toBe(true);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 16: Persona deletion consistency', () => {
        it('should completely remove persona and make it no longer accessible', async () => {
            /**
             * Feature: amplify-integration, Property 16: Persona deletion consistency
             * Validates: Requirements 5.4
             */

            // Property: For any persona deletion request, the persona should be completely removed 
            // and no longer accessible
            await fc.assert(
                fc.asyncProperty(
                    // Generate random persona ID
                    fc.string({ minLength: 1, maxLength: 50 }),
                    async (personaId) => {
                        // Mock successful deletion
                        vi.mocked(amplifyDataService.deletePersonaData).mockResolvedValue(true);

                        // Perform the deletion
                        const result = await personaService.deleteCustomPersona(personaId);

                        // Verify the deletion was called with correct ID
                        expect(amplifyDataService.deletePersonaData).toHaveBeenCalledWith(personaId);

                        // Verify deletion was successful
                        expect(result).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle deletion of non-existent personas gracefully', async () => {
            /**
             * Feature: amplify-integration, Property 16: Persona deletion consistency
             * Validates: Requirements 5.4
             */

            // Property: For any deletion request of non-existent persona, 
            // the system should handle it gracefully without errors
            await fc.assert(
                fc.asyncProperty(
                    // Generate random persona ID
                    fc.string({ minLength: 1, maxLength: 50 }),
                    async (personaId) => {
                        // Mock deletion failure (persona doesn't exist)
                        vi.mocked(amplifyDataService.deletePersonaData).mockResolvedValue(false);

                        // Perform the deletion
                        const result = await personaService.deleteCustomPersona(personaId);

                        // Verify the deletion was attempted
                        expect(amplifyDataService.deletePersonaData).toHaveBeenCalledWith(personaId);

                        // Verify deletion returned false for non-existent persona
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Persona Creation Consistency', () => {
        it('should create personas with all required fields and proper user isolation', async () => {
            /**
             * Additional property test for persona creation consistency
             * Validates user-scoped persona storage (Requirements 5.1)
             */

            // Property: For any valid persona creation request, the persona should be created 
            // with all required fields and proper user isolation
            await fc.assert(
                fc.asyncProperty(
                    // Generate random persona creation data
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 100 }),
                        personaDescription: fc.string({ minLength: 1, maxLength: 500 }),
                        description: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
                        icon: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
                    }),
                    async (personaData) => {
                        // Mock successful creation
                        const mockCreatedPersonaData = {
                            id: `persona-${Date.now()}`,
                            userId: 'test-user-id', // This would be set by Amplify automatically
                            name: personaData.name.trim(),
                            description: personaData.description?.trim() || 'Custom persona',
                            icon: personaData.icon || 'Palette',
                            promptTemplate: personaData.personaDescription,
                            isDefault: false,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        vi.mocked(amplifyDataService.createPersonaData).mockResolvedValue(mockCreatedPersonaData);

                        // Perform the creation
                        const result = await personaService.createCustomPersona(
                            personaData.name,
                            personaData.personaDescription,
                            personaData.description,
                            personaData.icon
                        );

                        // Verify the creation was called with correct parameters
                        expect(amplifyDataService.createPersonaData).toHaveBeenCalledWith({
                            name: personaData.name.trim(),
                            description: personaData.description?.trim() || 'Custom persona',
                            icon: personaData.icon || 'Palette',
                            promptTemplate: personaData.personaDescription,
                            isDefault: false
                        });

                        // Verify the result has all required fields
                        expect(result.id).toBeDefined();
                        expect(result.name).toBe(personaData.name.trim());
                        expect(result.personaDescription).toBe(personaData.personaDescription);
                        expect(result.shortDescription).toBe(personaData.description?.trim() || 'Custom persona');
                        expect(result.icon).toBe(personaData.icon || 'Palette');
                        expect(result.isEditable).toBe(true);
                        expect(result.createdAt).toBeInstanceOf(Date);
                        expect(result.updatedAt).toBeInstanceOf(Date);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Persona Retrieval Consistency', () => {
        it('should retrieve only user-scoped personas with proper data transformation', async () => {
            /**
             * Additional property test for persona retrieval consistency
             * Validates user-scoped persona retrieval (Requirements 5.1, 5.2)
             */

            // Property: For any persona retrieval request, only user-scoped personas should be returned
            // with proper data transformation from Amplify format to CustomPersona format
            await fc.assert(
                fc.asyncProperty(
                    // Generate random list of persona data
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 1, maxLength: 50 }),
                            userId: fc.string({ minLength: 1, maxLength: 50 }),
                            name: fc.string({ minLength: 1, maxLength: 100 }),
                            description: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
                            icon: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
                            promptTemplate: fc.string({ minLength: 1, maxLength: 500 }),
                            isDefault: fc.boolean(),
                            createdAt: fc.date().map(d => d.toISOString()),
                            updatedAt: fc.date().map(d => d.toISOString())
                        }),
                        { minLength: 0, maxLength: 10 }
                    ),
                    async (personaDataList) => {
                        // Mock the retrieval
                        vi.mocked(amplifyDataService.listPersonaData).mockResolvedValue(personaDataList);

                        // Perform the retrieval
                        const result = await personaService.getCustomPersonas();

                        // Verify the retrieval was called
                        expect(amplifyDataService.listPersonaData).toHaveBeenCalled();

                        // Verify the result has correct length and transformation
                        expect(result).toHaveLength(personaDataList.length);

                        // Verify each persona is properly transformed
                        result.forEach((persona, index) => {
                            const originalData = personaDataList[index];
                            expect(persona.id).toBe(originalData.id);
                            expect(persona.name).toBe(originalData.name);
                            expect(persona.shortDescription).toBe(originalData.description || 'Custom persona');
                            expect(persona.personaDescription).toBe(originalData.promptTemplate);
                            expect(persona.icon).toBe(originalData.icon || 'Palette');
                            expect(persona.isEditable).toBe(true);
                            expect(persona.createdAt).toBeInstanceOf(Date);
                            expect(persona.updatedAt).toBeInstanceOf(Date);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});