import { describe, it, expect, beforeEach } from 'vitest';
import { useImageStore } from './imageStore';
import { sqliteService } from '../services/sqliteService';
import type { GeneratedImage } from '../types';

describe('ImageStore Persistence', () => {
    beforeEach(async () => {
        // Clear database before each test
        await sqliteService.init();
        await sqliteService.clearAll();

        // Reset store to initial state
        useImageStore.setState({
            images: [],
            selectedAspectRatio: '1:1',
            editSource: null,
            isGenerating: false,
            isLoading: false,
        });
    });

    it('should persist images to SQLite database', async () => {
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

        // Check database has the data
        const images = await sqliteService.getAllImages();
        expect(images).toHaveLength(1);
        expect(images[0].id).toBe('test-1');
        expect(images[0].prompt).toBe('test prompt');
    });

    it('should persist selectedAspectRatio to database', async () => {
        // Set aspect ratio
        await useImageStore.getState().setAspectRatio('21:9');

        // Check database
        const stored = await sqliteService.getSetting('selectedAspectRatio');
        expect(stored).toBe('21:9');
    });

    it('should handle Date objects correctly', async () => {
        const testDate = new Date('2024-01-15T12:30:00.000Z');
        const testImage: GeneratedImage = {
            id: 'test-date',
            url: 'data:image/png;base64,test',
            prompt: 'date test',
            status: 'complete',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            createdAt: testDate,
        };

        await useImageStore.getState().addImage(testImage);

        const images = await sqliteService.getAllImages();
        expect(images[0].createdAt).toBeInstanceOf(Date);
        expect(images[0].createdAt.getTime()).toBe(testDate.getTime());
    });

    it('should not persist transient state (editSource, isGenerating)', async () => {
        // Add an image first
        const testImage: GeneratedImage = {
            id: 'test-transient',
            url: 'data:image/png;base64,test',
            prompt: 'test prompt',
            status: 'complete',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            createdAt: new Date(),
        };
        await useImageStore.getState().addImage(testImage);

        // Set transient state
        useImageStore.setState({
            editSource: {
                url: 'test-url',
                aspectRatio: '1:1',
                width: 1024,
                height: 1024,
            },
            isGenerating: true,
        });

        // Clear the store state and reinitialize (simulating app restart)
        useImageStore.setState({
            images: [],
            selectedAspectRatio: '1:1',
            editSource: null,
            isGenerating: false,
            isLoading: false,
        });

        // Initialize store (which loads from database)
        await useImageStore.getState().initialize();

        // Transient state should not be persisted (should be reset to defaults)
        const state = useImageStore.getState();
        expect(state.editSource).toBeNull();
        expect(state.isGenerating).toBe(false);
        // But images should be loaded
        expect(state.images).toHaveLength(1);
    });

    it('should update images in database', async () => {
        const testImage: GeneratedImage = {
            id: 'test-update',
            url: 'data:image/png;base64,test',
            prompt: 'test prompt',
            status: 'generating',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            createdAt: new Date(),
        };

        await useImageStore.getState().addImage(testImage);
        await useImageStore.getState().updateImage('test-update', {
            status: 'complete',
            url: 'data:image/png;base64,updated',
        });

        const images = await sqliteService.getAllImages();
        expect(images[0].status).toBe('complete');
        expect(images[0].url).toBe('data:image/png;base64,updated');
    });

    it('should delete images from database', async () => {
        const testImage: GeneratedImage = {
            id: 'test-delete',
            url: 'data:image/png;base64,test',
            prompt: 'test prompt',
            status: 'complete',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            createdAt: new Date(),
        };

        await useImageStore.getState().addImage(testImage);
        await useImageStore.getState().deleteImage('test-delete');

        const images = await sqliteService.getAllImages();
        expect(images).toHaveLength(0);
    });
});
