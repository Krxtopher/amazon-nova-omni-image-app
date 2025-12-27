import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useImageStore } from './imageStore';
import type { GeneratedImage } from '../types';

// Mock the services
vi.mock('../services/sqliteService', () => ({
    sqliteService: {
        init: vi.fn(),
        addImage: vi.fn(),
        updateImage: vi.fn(),
        deleteImage: vi.fn(),
        getAllImageMetadata: vi.fn(() => []),
        getCompleteImageMetadataCount: vi.fn(() => 0),
        getCompleteImageMetadataPaginated: vi.fn(() => []),
    }
}));

vi.mock('../services/BinaryStorageService', () => ({
    binaryStorageService: {
        storeImageDataWithQuotaManagement: vi.fn(),
        getImageData: vi.fn(),
        deleteImageData: vi.fn(),
    }
}));

vi.mock('../utils/StorageLogger', () => ({
    storageLogger: {
        startOperation: vi.fn(() => ({
            success: vi.fn(),
            error: vi.fn(),
        })),
    }
}));

describe('ImageStore Database Write Optimization', () => {
    beforeEach(() => {
        // Reset store state before each test
        useImageStore.setState({
            images: [],
            textItems: [],
            isGenerating: false,
            isLoading: false,
            hasMoreImages: true,
            isLoadingMore: false,
            totalImageCount: 0,
            loadedImageCount: 0,
        });

        // Clear all mocks
        vi.clearAllMocks();
    });

    it('should add placeholder image to UI without database write', async () => {
        const { sqliteService } = await import('../services/sqliteService');
        const { binaryStorageService } = await import('../services/BinaryStorageService');

        const placeholderImage: GeneratedImage = {
            id: 'test-placeholder',
            url: '',
            prompt: 'test prompt',
            status: 'generating',
            aspectRatio: '1:1',
            width: 512,
            height: 512,
            createdAt: new Date(),
        };

        // Add placeholder image
        useImageStore.getState().addPlaceholderImage(placeholderImage);

        // Verify image is in UI state
        const state = useImageStore.getState();
        expect(state.images).toHaveLength(1);
        expect(state.images[0].id).toBe('test-placeholder');
        expect(state.images[0].status).toBe('generating');

        // Verify no database calls were made
        expect(sqliteService.addImage).not.toHaveBeenCalled();
        expect(binaryStorageService.storeImageDataWithQuotaManagement).not.toHaveBeenCalled();

        // Verify totalImageCount is not incremented (since not in database)
        expect(state.totalImageCount).toBe(0);
        expect(state.loadedImageCount).toBe(1); // But UI count is incremented
    });

    it('should write to database only when placeholder becomes complete', async () => {
        const { sqliteService } = await import('../services/sqliteService');
        const { binaryStorageService } = await import('../services/BinaryStorageService');

        const placeholderImage: GeneratedImage = {
            id: 'test-placeholder',
            url: '',
            prompt: 'test prompt',
            status: 'generating',
            aspectRatio: '1:1',
            width: 512,
            height: 512,
            createdAt: new Date(),
        };

        // Add placeholder image (no database write)
        useImageStore.getState().addPlaceholderImage(placeholderImage);

        // Verify no database calls yet
        expect(sqliteService.addImage).not.toHaveBeenCalled();

        // Update to complete status with image data
        const imageDataUrl = 'data:image/png;base64,test-data';
        await useImageStore.getState().updateImage('test-placeholder', {
            status: 'complete',
            url: imageDataUrl,
        });

        // Verify database write happened when status became complete
        expect(sqliteService.addImage).toHaveBeenCalledTimes(1);
        expect(binaryStorageService.storeImageDataWithQuotaManagement).toHaveBeenCalledWith(
            'test-placeholder',
            imageDataUrl
        );

        // Verify totalImageCount is now incremented
        const state = useImageStore.getState();
        expect(state.totalImageCount).toBe(1);
    });

    it('should not write to database if generation fails', async () => {
        const { sqliteService } = await import('../services/sqliteService');
        const { binaryStorageService } = await import('../services/BinaryStorageService');

        const placeholderImage: GeneratedImage = {
            id: 'test-placeholder',
            url: '',
            prompt: 'test prompt',
            status: 'generating',
            aspectRatio: '1:1',
            width: 512,
            height: 512,
            createdAt: new Date(),
        };

        // Add placeholder image (no database write)
        useImageStore.getState().addPlaceholderImage(placeholderImage);

        // Update to error status
        await useImageStore.getState().updateImage('test-placeholder', {
            status: 'error',
            error: 'Generation failed',
        });

        // Verify no database write happened
        expect(sqliteService.addImage).not.toHaveBeenCalled();
        expect(binaryStorageService.storeImageDataWithQuotaManagement).not.toHaveBeenCalled();

        // Verify image is still in UI but not counted in database total
        const state = useImageStore.getState();
        expect(state.images).toHaveLength(1);
        expect(state.images[0].status).toBe('error');
        expect(state.totalImageCount).toBe(0); // Not in database
    });

    it('should allow enhanced prompt updates without database write for placeholders', async () => {
        const { sqliteService } = await import('../services/sqliteService');

        const placeholderImage: GeneratedImage = {
            id: 'test-placeholder',
            url: '',
            prompt: 'test prompt',
            status: 'generating',
            aspectRatio: '1:1',
            width: 512,
            height: 512,
            createdAt: new Date(),
        };

        // Add placeholder image
        useImageStore.getState().addPlaceholderImage(placeholderImage);

        // Update with enhanced prompt (should not trigger database write)
        await useImageStore.getState().updateImage('test-placeholder', {
            enhancedPrompt: 'enhanced test prompt with more details',
        });

        // Verify no database write happened
        expect(sqliteService.addImage).not.toHaveBeenCalled();
        expect(sqliteService.updateImage).not.toHaveBeenCalled();

        // Verify enhanced prompt is in UI
        const state = useImageStore.getState();
        expect(state.images[0].enhancedPrompt).toBe('enhanced test prompt with more details');
    });
});