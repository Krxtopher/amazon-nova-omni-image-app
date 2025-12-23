import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { useImageStore } from './imageStore';
import { sqliteService } from '../services/sqliteService';
import { binaryStorageService } from '../services/BinaryStorageService';
import type { GeneratedImage, GeneratedText } from '../types';

// Mock the services to verify routing behavior
vi.mock('../services/sqliteService', () => ({
    sqliteService: {
        init: vi.fn().mockResolvedValue(undefined),
        addImage: vi.fn().mockResolvedValue(undefined),
        updateImage: vi.fn().mockResolvedValue(undefined),
        deleteImage: vi.fn().mockResolvedValue(undefined),
        clearAll: vi.fn().mockResolvedValue(undefined),
        getAllImageMetadata: vi.fn().mockResolvedValue([]),
        getCompleteImageMetadataCount: vi.fn().mockResolvedValue(0),
        getCompleteImageMetadataPaginated: vi.fn().mockResolvedValue([]),
    }
}));

vi.mock('../services/BinaryStorageService', () => ({
    binaryStorageService: {
        storeImageDataWithQuotaManagement: vi.fn().mockResolvedValue(undefined),
        getImageData: vi.fn().mockResolvedValue(null),
        deleteImageData: vi.fn().mockResolvedValue(undefined),
        deleteMultipleImageData: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('ImageStore Coordination Tests', () => {
    beforeEach(async () => {
        // Clear all mocks
        vi.clearAllMocks();

        // Reset store to initial state
        useImageStore.setState({
            images: [],
            textItems: [],
            isGenerating: false,
            isLoading: false,
            hasMoreImages: true,
            isLoadingMore: false,
            totalImageCount: 0,
        });
    });

    describe('Property-Based Tests', () => {
        /**
         * **Feature: data-storage-optimization, Property 3: Storage Mechanism Routing**
         * **Validates: Requirements 2.1, 3.1, 4.1, 5.1, 5.2**
         */
        it('should route data to appropriate storage mechanisms for any image data', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        prompt: fc.string({ minLength: 1, maxLength: 200 }),
                        status: fc.constantFrom('complete', 'pending', 'generating', 'error'),
                        aspectRatio: fc.constantFrom('1:1', '16:9', '9:16', '4:3'),
                        width: fc.integer({ min: 256, max: 2048 }),
                        height: fc.integer({ min: 256, max: 2048 }),
                        url: fc.option(fc.string({ minLength: 10, maxLength: 100 }).map(s => `data:image/png;base64,${btoa(s)}`), { freq: 4, nil: undefined }),
                        error: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { freq: 1, nil: undefined }),
                    }), { minLength: 1, maxLength: 5 }),
                    async (images) => {
                        // Clear mocks for this test iteration
                        vi.clearAllMocks();

                        // Test storage mechanism routing for each image
                        for (const imageData of images) {
                            const image: GeneratedImage = {
                                ...imageData,
                                createdAt: new Date(),
                            };

                            // Add image through the coordinated store
                            await useImageStore.getState().addImage(image);

                            // Verify SQLite service was called with metadata only (no binary data)
                            expect(sqliteService.addImage).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    id: image.id,
                                    prompt: image.prompt,
                                    status: image.status,
                                    aspectRatio: image.aspectRatio,
                                    width: image.width,
                                    height: image.height,
                                    url: undefined, // Binary data should not be in SQLite
                                    hasBinaryData: Boolean(image.url),
                                    binaryDataSize: image.url ? image.url.length : 0,
                                })
                            );

                            // Verify IndexedDB service was called only if binary data exists
                            if (image.url) {
                                expect(binaryStorageService.storeImageDataWithQuotaManagement).toHaveBeenCalledWith(
                                    image.id,
                                    image.url
                                );
                            } else {
                                expect(binaryStorageService.storeImageDataWithQuotaManagement).not.toHaveBeenCalledWith(
                                    image.id,
                                    expect.anything()
                                );
                            }
                        }

                        // Verify the correct number of calls were made
                        expect(sqliteService.addImage).toHaveBeenCalledTimes(images.length);

                        const imagesWithBinaryData = images.filter(img => img.url);
                        expect(binaryStorageService.storeImageDataWithQuotaManagement).toHaveBeenCalledTimes(imagesWithBinaryData.length);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should route image data loading requests to IndexedDB for any image ID', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        dataUrl: fc.string({ minLength: 10, maxLength: 100 }).map(s => `data:image/png;base64,${btoa(s)}`),
                    }), { minLength: 1, maxLength: 3 }),
                    async (imageDataRecords) => {
                        // Clear previous mock calls
                        vi.clearAllMocks();

                        // Mock IndexedDB responses for this test run
                        const mockResponses = new Map(imageDataRecords.map(record => [record.id, record.dataUrl]));
                        vi.mocked(binaryStorageService.getImageData).mockImplementation(async (id: string) => {
                            return mockResponses.get(id) || null;
                        });

                        // Test loading image data for each ID
                        for (const record of imageDataRecords) {
                            const result = await useImageStore.getState().loadImageData(record.id);

                            // Verify IndexedDB service was called (not SQLite)
                            expect(binaryStorageService.getImageData).toHaveBeenCalledWith(record.id);

                            // Verify correct data was returned
                            expect(result).toBe(record.dataUrl);
                        }

                        // Verify the correct number of calls were made
                        expect(binaryStorageService.getImageData).toHaveBeenCalledTimes(imageDataRecords.length);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should route app settings to localStorage (not database storage)', async () => {
            // This test verifies that app settings are handled separately from image data
            // Settings should use localStorage, not SQLite or IndexedDB

            // Mock localStorage
            const mockLocalStorage = {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            };
            Object.defineProperty(window, 'localStorage', {
                value: mockLocalStorage,
                writable: true,
            });

            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        content: fc.string({ minLength: 1, maxLength: 100 }),
                        prompt: fc.string({ minLength: 1, maxLength: 100 }),
                        status: fc.constantFrom('complete', 'pending', 'generating', 'error'),
                    }), { minLength: 1, maxLength: 3 }),
                    async (textItems) => {
                        // Add text items (which use localStorage for settings-like data)
                        for (const item of textItems) {
                            const textItem: GeneratedText = {
                                id: item.id,
                                content: item.content,
                                prompt: item.prompt,
                                status: item.status,
                                createdAt: new Date(),
                            };

                            useImageStore.getState().addTextItem(textItem);
                        }

                        // Verify localStorage was used for text items (settings-like data)
                        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                            'textItems',
                            expect.any(String)
                        );

                        // Verify database services were NOT called for settings-like data
                        expect(sqliteService.addImage).not.toHaveBeenCalled();
                        expect(binaryStorageService.storeImageDataWithQuotaManagement).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * **Feature: data-storage-optimization, Property 7: Comprehensive Error Handling**
         * **Validates: Requirements 1.5, 2.4, 3.4, 4.3, 5.3**
         */
        it('should handle storage failures gracefully and maintain data consistency', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        prompt: fc.string({ minLength: 1, maxLength: 200 }),
                        status: fc.constantFrom('complete', 'pending', 'generating', 'error'),
                        aspectRatio: fc.constantFrom('1:1', '16:9', '9:16', '4:3'),
                        width: fc.integer({ min: 256, max: 2048 }),
                        height: fc.integer({ min: 256, max: 2048 }),
                        url: fc.option(fc.string({ minLength: 10, maxLength: 100 }).map(s => `data:image/png;base64,${btoa(s)}`), { freq: 4, nil: undefined }),
                        error: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { freq: 1, nil: undefined }),
                    }), { minLength: 1, maxLength: 3 }),
                    fc.constantFrom('sqlite_failure', 'indexeddb_failure', 'both_failure'),
                    async (images, failureType) => {
                        // Clear mocks for this test iteration
                        vi.clearAllMocks();

                        // Set up failure scenarios
                        const sqliteError = new Error('SQLite operation failed');
                        const indexedDBError = new Error('IndexedDB operation failed');

                        if (failureType === 'sqlite_failure' || failureType === 'both_failure') {
                            vi.mocked(sqliteService.addImage).mockRejectedValue(sqliteError);
                            vi.mocked(sqliteService.updateImage).mockRejectedValue(sqliteError);
                            vi.mocked(sqliteService.deleteImage).mockRejectedValue(sqliteError);
                        }

                        if (failureType === 'indexeddb_failure' || failureType === 'both_failure') {
                            vi.mocked(binaryStorageService.storeImageDataWithQuotaManagement).mockRejectedValue(indexedDBError);
                            vi.mocked(binaryStorageService.deleteImageData).mockRejectedValue(indexedDBError);
                        }

                        // Test error handling for addImage operations
                        for (const imageData of images) {
                            const image: GeneratedImage = {
                                ...imageData,
                                url: imageData.url || undefined, // Convert null to undefined
                                error: imageData.error || undefined, // Convert null to undefined
                                createdAt: new Date(),
                            };

                            try {
                                await useImageStore.getState().addImage(image);

                                // If we reach here without error, verify the operation succeeded
                                if (failureType === 'sqlite_failure' || failureType === 'both_failure') {
                                    // Should have failed - this is unexpected
                                    expect(true).toBe(false); // Force failure
                                }
                            } catch (error) {
                                // Verify error handling behavior
                                expect(error).toBeInstanceOf(Error);
                                expect((error as Error).message).toContain('Failed to store image data');

                                // Verify rollback occurred - image should not be in UI state
                                const currentState = useImageStore.getState();
                                const imageInState = currentState.images.find(img => img.id === image.id);
                                expect(imageInState).toBeUndefined();
                            }
                        }

                        // Test error handling for updateImage operations
                        // First add a successful image to update
                        vi.clearAllMocks();
                        const testImage: GeneratedImage = {
                            id: 'test-update',
                            prompt: 'test',
                            status: 'complete',
                            aspectRatio: '1:1',
                            width: 1024,
                            height: 1024,
                            createdAt: new Date(),
                            url: 'data:image/png;base64,test'
                        };

                        // Add image to state for testing updates
                        useImageStore.setState(state => ({
                            images: [testImage, ...state.images]
                        }));

                        // Set up failures again for update test
                        if (failureType === 'sqlite_failure' || failureType === 'both_failure') {
                            vi.mocked(sqliteService.updateImage).mockRejectedValue(sqliteError);
                        }

                        if (failureType === 'indexeddb_failure' || failureType === 'both_failure') {
                            vi.mocked(binaryStorageService.storeImageDataWithQuotaManagement).mockRejectedValue(indexedDBError);
                        }

                        try {
                            await useImageStore.getState().updateImage('test-update', {
                                status: 'error',
                                url: 'data:image/png;base64,updated'
                            });

                            // If we reach here without error, verify the operation succeeded
                            if (failureType === 'sqlite_failure' || failureType === 'both_failure') {
                                // Should have failed - this is unexpected
                                expect(true).toBe(false); // Force failure
                            }
                        } catch (error) {
                            // Verify error handling behavior for updates
                            expect(error).toBeInstanceOf(Error);
                            expect((error as Error).message).toContain('Failed to update image data');

                            // For updates, UI changes are not rolled back (by design)
                            // The user can retry the operation if needed
                        }

                        // Test error handling for deleteImage operations
                        // Reset mocks for delete test
                        vi.clearAllMocks();

                        if (failureType === 'sqlite_failure' || failureType === 'both_failure') {
                            vi.mocked(sqliteService.deleteImage).mockRejectedValue(sqliteError);
                        }

                        if (failureType === 'indexeddb_failure' || failureType === 'both_failure') {
                            vi.mocked(binaryStorageService.deleteImageData).mockRejectedValue(indexedDBError);
                        }

                        // Delete operations should not throw errors (they handle failures internally)
                        await useImageStore.getState().deleteImage('test-update');

                        // Verify UI state was updated (deletion is not rolled back)
                        const finalState = useImageStore.getState();
                        const deletedImage = finalState.images.find(img => img.id === 'test-update');
                        expect(deletedImage).toBeUndefined();

                        // Verify cleanup was attempted (even if it failed)
                        expect(sqliteService.deleteImage).toHaveBeenCalledWith('test-update');
                        expect(binaryStorageService.deleteImageData).toHaveBeenCalledWith('test-update');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});