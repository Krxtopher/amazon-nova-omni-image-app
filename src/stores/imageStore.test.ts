import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useImageStore } from './imageStore';
import { sqliteService } from '../services/sqliteService';
import { binaryStorageService } from '../services/BinaryStorageService';
import type { GeneratedImage } from '../types';

// Mock the services to test coordination behavior
vi.mock('../services/sqliteService', () => ({
    sqliteService: {
        init: vi.fn().mockResolvedValue(undefined),
        addImage: vi.fn().mockResolvedValue(undefined),
        updateImage: vi.fn().mockResolvedValue(undefined),
        deleteImage: vi.fn().mockResolvedValue(undefined),
        clearAll: vi.fn().mockResolvedValue(undefined),
        getAllImages: vi.fn().mockResolvedValue([]),
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

describe('ImageStore Coordinated Operations', () => {
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

    describe('addImage coordination', () => {
        it('should coordinate storage between SQLite (metadata) and IndexedDB (binary data)', async () => {
            const testImage: GeneratedImage = {
                id: 'test-1',
                url: 'data:image/png;base64,test',
                prompt: 'test prompt',
                status: 'complete',
                aspectRatio: '16:9',
                width: 1344,
                height: 768,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
            };

            // Add image to store
            await useImageStore.getState().addImage(testImage);

            // Verify SQLite service was called with metadata only (no binary data)
            expect(sqliteService.addImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'test-1',
                    prompt: 'test prompt',
                    status: 'complete',
                    aspectRatio: '16:9',
                    width: 1344,
                    height: 768,
                    url: undefined, // Binary data should not be in SQLite
                    hasBinaryData: true,
                    binaryDataSize: testImage.url!.length,
                })
            );

            // Verify IndexedDB service was called with binary data
            expect(binaryStorageService.storeImageDataWithQuotaManagement).toHaveBeenCalledWith(
                'test-1',
                'data:image/png;base64,test'
            );

            // Verify UI state was updated immediately
            const state = useImageStore.getState();
            expect(state.images).toHaveLength(1);
            expect(state.images[0].id).toBe('test-1');
        });

        it('should handle images without binary data correctly', async () => {
            const testImage: GeneratedImage = {
                id: 'test-no-binary',
                prompt: 'test prompt',
                status: 'pending',
                aspectRatio: '1:1',
                width: 1024,
                height: 1024,
                createdAt: new Date(),
                // No URL - no binary data
            };

            await useImageStore.getState().addImage(testImage);

            // Verify SQLite service was called with metadata
            expect(sqliteService.addImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'test-no-binary',
                    url: undefined,
                    hasBinaryData: false,
                    binaryDataSize: 0,
                })
            );

            // Verify IndexedDB service was NOT called for binary data
            expect(binaryStorageService.storeImageDataWithQuotaManagement).not.toHaveBeenCalled();
        });

        it('should rollback UI changes if storage fails', async () => {
            const testImage: GeneratedImage = {
                id: 'test-rollback',
                url: 'data:image/png;base64,test',
                prompt: 'test prompt',
                status: 'complete',
                aspectRatio: '1:1',
                width: 1024,
                height: 1024,
                createdAt: new Date(),
            };

            // Mock SQLite failure
            vi.mocked(sqliteService.addImage).mockRejectedValue(new Error('SQLite failed'));

            // Attempt to add image should throw
            await expect(useImageStore.getState().addImage(testImage)).rejects.toThrow('Failed to store image data');

            // Verify UI state was rolled back
            const state = useImageStore.getState();
            expect(state.images).toHaveLength(0);
            expect(state.totalImageCount).toBe(0);

            // Verify cleanup was attempted
            expect(sqliteService.deleteImage).toHaveBeenCalledWith('test-rollback');
            expect(binaryStorageService.deleteImageData).toHaveBeenCalledWith('test-rollback');
        });
    });

    describe('updateImage coordination', () => {
        beforeEach(() => {
            // Add a test image to state for update tests
            useImageStore.setState(_state => ({
                images: [{
                    id: 'test-update',
                    prompt: 'test prompt',
                    status: 'generating',
                    aspectRatio: '1:1',
                    width: 1024,
                    height: 1024,
                    createdAt: new Date(),
                }],
                totalImageCount: 1,
            }));
        });

        it('should coordinate updates between SQLite (metadata) and IndexedDB (binary data)', async () => {
            await useImageStore.getState().updateImage('test-update', {
                status: 'complete',
                url: 'data:image/png;base64,updated',
            });

            // Verify SQLite service was called with metadata updates
            expect(sqliteService.updateImage).toHaveBeenCalledWith('test-update', {
                status: 'complete',
                hasBinaryData: true,
                binaryDataSize: 'data:image/png;base64,updated'.length,
            });

            // Verify IndexedDB service was called with binary data
            expect(binaryStorageService.storeImageDataWithQuotaManagement).toHaveBeenCalledWith(
                'test-update',
                'data:image/png;base64,updated'
            );

            // Verify UI state was updated
            const state = useImageStore.getState();
            expect(state.images[0].status).toBe('complete');
            expect(state.images[0].url).toBe('data:image/png;base64,updated');
        });

        it('should handle metadata-only updates', async () => {
            await useImageStore.getState().updateImage('test-update', {
                status: 'error',
                error: 'Generation failed',
            });

            // Verify SQLite service was called with metadata updates only
            expect(sqliteService.updateImage).toHaveBeenCalledWith('test-update', {
                status: 'error',
                error: 'Generation failed',
            });

            // Verify IndexedDB service was NOT called
            expect(binaryStorageService.storeImageDataWithQuotaManagement).not.toHaveBeenCalled();
        });

        it('should handle binary data removal', async () => {
            await useImageStore.getState().updateImage('test-update', {
                url: undefined, // Remove binary data
            });

            // Verify SQLite service was called with metadata updates
            expect(sqliteService.updateImage).toHaveBeenCalledWith('test-update', {
                hasBinaryData: false,
                binaryDataSize: 0,
            });

            // Verify IndexedDB service was called to delete binary data
            expect(binaryStorageService.deleteImageData).toHaveBeenCalledWith('test-update');
        });

        it('should throw error if update fails but not rollback UI changes', async () => {
            // Mock SQLite failure
            vi.mocked(sqliteService.updateImage).mockRejectedValue(new Error('Update failed'));

            // Attempt to update should throw
            await expect(useImageStore.getState().updateImage('test-update', {
                status: 'complete'
            })).rejects.toThrow('Failed to update image data');

            // Verify UI state was NOT rolled back (by design for updates)
            const state = useImageStore.getState();
            expect(state.images[0].status).toBe('complete'); // UI was updated immediately
        });
    });

    describe('deleteImage coordination', () => {
        beforeEach(() => {
            // Add a test image to state for delete tests
            useImageStore.setState(_state => ({
                images: [{
                    id: 'test-delete',
                    prompt: 'test prompt',
                    status: 'complete',
                    aspectRatio: '1:1',
                    width: 1024,
                    height: 1024,
                    createdAt: new Date(),
                    url: 'data:image/png;base64,test',
                }],
                totalImageCount: 1,
            }));
        });

        it('should coordinate cleanup between SQLite (metadata) and IndexedDB (binary data)', async () => {
            await useImageStore.getState().deleteImage('test-delete');

            // Verify both storage mechanisms were called for cleanup
            expect(sqliteService.deleteImage).toHaveBeenCalledWith('test-delete');
            expect(binaryStorageService.deleteImageData).toHaveBeenCalledWith('test-delete');

            // Verify UI state was updated immediately
            const state = useImageStore.getState();
            expect(state.images).toHaveLength(0);
            expect(state.totalImageCount).toBe(0);
        });

        it('should handle storage failures gracefully without rolling back UI changes', async () => {
            // Mock storage failures
            vi.mocked(sqliteService.deleteImage).mockRejectedValue(new Error('SQLite delete failed'));
            vi.mocked(binaryStorageService.deleteImageData).mockRejectedValue(new Error('IndexedDB delete failed'));

            // Delete should not throw (handles errors internally)
            await useImageStore.getState().deleteImage('test-delete');

            // Verify UI state was still updated (deletion is not rolled back)
            const state = useImageStore.getState();
            expect(state.images).toHaveLength(0);

            // Verify cleanup was attempted
            expect(sqliteService.deleteImage).toHaveBeenCalledWith('test-delete');
            expect(binaryStorageService.deleteImageData).toHaveBeenCalledWith('test-delete');
        });
    });

    describe('performance monitoring', () => {
        it('should log performance metrics for IndexedDB loads', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
            vi.mocked(binaryStorageService.getImageData).mockResolvedValue('data:image/png;base64,loaded');

            await useImageStore.getState().loadImageData('new-image');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[IMAGE_LOAD] Loading image data for new-image')
            );

            consoleSpy.mockRestore();
        });

        it('should log errors when image loading fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.mocked(binaryStorageService.getImageData).mockRejectedValue(new Error('Load failed'));

            const result = await useImageStore.getState().loadImageData('failing-image');

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[IMAGE_LOAD] Failed to load failing-image'),
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });
});
