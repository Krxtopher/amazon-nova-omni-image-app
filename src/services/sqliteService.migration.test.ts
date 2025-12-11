import { describe, it, expect, beforeEach } from 'vitest';
import { sqliteService } from './sqliteService';
import type { GeneratedImage, ConverseRequestParams } from '../types';

describe('SQLiteService - Migration Tests', () => {
    beforeEach(async () => {
        // Clear all data before each test
        await sqliteService.clearAll();
    });

    it('should handle converseParams in new images', async () => {
        const mockConverseParams: ConverseRequestParams = {
            modelId: 'us.amazon.nova-2-omni-v1:0',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            text: 'A beautiful sunset over mountains',
                        },
                    ],
                },
            ],
        };

        const mockImage: GeneratedImage = {
            id: 'test-image-1',
            url: 'data:image/png;base64,test-data',
            prompt: 'A beautiful sunset over mountains',
            status: 'complete',
            aspectRatio: '16:9',
            width: 1344,
            height: 768,
            createdAt: new Date(),
            converseParams: mockConverseParams,
        };

        // Add image with converseParams
        await sqliteService.addImage(mockImage);

        // Retrieve all images
        const images = await sqliteService.getAllImages();

        expect(images).toHaveLength(1);
        expect(images[0].id).toBe('test-image-1');
        expect(images[0].converseParams).toBeDefined();
        expect(images[0].converseParams?.modelId).toBe('us.amazon.nova-2-omni-v1:0');
        expect(images[0].converseParams?.messages).toHaveLength(1);
        expect(images[0].converseParams?.messages[0].content[0].text).toBe('A beautiful sunset over mountains');
    });

    it('should handle images without converseParams', async () => {
        const mockImage: GeneratedImage = {
            id: 'test-image-2',
            url: 'data:image/jpeg;base64,test-data',
            prompt: 'A beautiful landscape',
            status: 'complete',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            createdAt: new Date(),
            // No converseParams
        };

        // Add image without converseParams
        await sqliteService.addImage(mockImage);

        // Retrieve all images
        const images = await sqliteService.getAllImages();

        expect(images).toHaveLength(1);
        expect(images[0].id).toBe('test-image-2');
        expect(images[0].converseParams).toBeUndefined();
    });

    it('should update images with converseParams', async () => {
        const mockConverseParams: ConverseRequestParams = {
            modelId: 'us.amazon.nova-2-omni-v1:0',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            text: 'Updated prompt',
                        },
                    ],
                },
            ],
        };

        const mockImage: GeneratedImage = {
            id: 'test-image-3',
            url: 'data:image/png;base64,test-data',
            prompt: 'Original prompt',
            status: 'generating',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            createdAt: new Date(),
        };

        // Add image without converseParams
        await sqliteService.addImage(mockImage);

        // Update with converseParams
        await sqliteService.updateImage('test-image-3', {
            status: 'complete',
            converseParams: mockConverseParams,
        });

        // Retrieve all images
        const images = await sqliteService.getAllImages();

        expect(images).toHaveLength(1);
        expect(images[0].id).toBe('test-image-3');
        expect(images[0].status).toBe('complete');
        expect(images[0].converseParams).toBeDefined();
        expect(images[0].converseParams?.messages[0].content[0].text).toBe('Updated prompt');
    });
});