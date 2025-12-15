import { describe, it, expect, beforeEach } from 'vitest';
import { sqliteService } from '../services/sqliteService';
import type { GeneratedImage } from '../types';

describe('Incomplete Image Cleanup', () => {
    beforeEach(async () => {
        // Clear database before each test
        await sqliteService.clearAll();
    });

    it('should delete incomplete images on initialization', async () => {
        // Add test images with different statuses
        const testImages: GeneratedImage[] = [
            {
                id: 'complete-1',
                url: 'data:image/png;base64,test1',
                prompt: 'Test prompt 1',
                status: 'complete',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
            },
            {
                id: 'pending-1',
                url: 'data:image/png;base64,test2',
                prompt: 'Test prompt 2',
                status: 'pending',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
            },
            {
                id: 'queued-1',
                url: 'data:image/png;base64,test6',
                prompt: 'Test prompt 6',
                status: 'queued',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
            },
            {
                id: 'generating-1',
                url: 'data:image/png;base64,test3',
                prompt: 'Test prompt 3',
                status: 'generating',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
            },
            {
                id: 'error-1',
                url: 'data:image/png;base64,test4',
                prompt: 'Test prompt 4',
                status: 'error',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
                error: 'Test error',
            },
            {
                id: 'complete-2',
                url: 'data:image/png;base64,test5',
                prompt: 'Test prompt 5',
                status: 'complete',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
            },
        ];

        // Add all test images to database
        for (const image of testImages) {
            await sqliteService.addImage(image);
        }

        // Verify all images are in database
        const allImages = await sqliteService.getAllImages();
        expect(allImages).toHaveLength(6);

        // Simulate the cleanup that happens during initialization
        const deletedCount = await sqliteService.deleteImagesByStatus(['pending', 'queued', 'generating', 'error']);
        expect(deletedCount).toBe(4);

        // Verify only complete images remain
        const remainingImages = await sqliteService.getAllImages();
        expect(remainingImages).toHaveLength(2);
        expect(remainingImages.every(img => img.status === 'complete')).toBe(true);
        expect(remainingImages.map(img => img.id)).toEqual(['complete-1', 'complete-2']);
    });

    it('should handle empty database gracefully', async () => {
        // Test cleanup on empty database
        const deletedCount = await sqliteService.deleteImagesByStatus(['pending', 'generating', 'error']);
        expect(deletedCount).toBe(0);

        const images = await sqliteService.getAllImages();
        expect(images).toHaveLength(0);
    });

    it('should handle database with only complete images', async () => {
        // Add only complete images
        const completeImage: GeneratedImage = {
            id: 'complete-only',
            url: 'data:image/png;base64,test',
            prompt: 'Test prompt',
            status: 'complete',
            aspectRatio: '1:1',
            width: 512,
            height: 512,
            createdAt: new Date(),
        };

        await sqliteService.addImage(completeImage);

        // Test cleanup - should delete nothing
        const deletedCount = await sqliteService.deleteImagesByStatus(['pending', 'queued', 'generating', 'error']);
        expect(deletedCount).toBe(0);

        // Verify image is still there
        const images = await sqliteService.getAllImages();
        expect(images).toHaveLength(1);
        expect(images[0].status).toBe('complete');
    });
});