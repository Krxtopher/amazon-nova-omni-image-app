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
            isGenerating: false,
            isLoading: false,
            textItems: [],
            imageDataCache: new Map(),
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
