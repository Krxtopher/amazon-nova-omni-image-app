import { describe, it, expect, beforeEach } from 'vitest';
import { sqliteService } from '../services/sqliteService';
import type { GeneratedImage } from '../types';

describe('Lazy Loading', () => {
    beforeEach(async () => {
        // Clear database before each test
        await sqliteService.clearAll();
    });

    it('should store image metadata and data separately', async () => {
        const testImage: GeneratedImage = {
            id: 'test-1',
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            prompt: 'Test image',
            status: 'complete',
            aspectRatio: '1:1',
            width: 100,
            height: 100,
            createdAt: new Date(),
        };

        // Add image
        await sqliteService.addImage(testImage);

        // Get metadata only (should not include URL)
        const metadata = await sqliteService.getAllImageMetadata();
        expect(metadata).toHaveLength(1);
        expect(metadata[0].id).toBe('test-1');
        expect(metadata[0].prompt).toBe('Test image');
        expect('url' in metadata[0]).toBe(false); // URL should not be in metadata

        // Get image data separately
        const imageData = await sqliteService.getImageData('test-1');
        expect(imageData).toBeTruthy();
        expect(imageData?.id).toBe('test-1');
        expect(imageData?.url).toBe(testImage.url);
    });

    it('should handle missing image data gracefully', async () => {
        const imageData = await sqliteService.getImageData('non-existent');
        expect(imageData).toBeNull();
    });

    it('should delete both metadata and data when deleting image', async () => {
        const testImage: GeneratedImage = {
            id: 'test-delete',
            url: 'data:image/png;base64,test',
            prompt: 'Test delete',
            status: 'complete',
            aspectRatio: '1:1',
            width: 100,
            height: 100,
            createdAt: new Date(),
        };

        // Add image
        await sqliteService.addImage(testImage);

        // Verify it exists
        const metadata = await sqliteService.getAllImageMetadata();
        const imageData = await sqliteService.getImageData('test-delete');
        expect(metadata).toHaveLength(1);
        expect(imageData).toBeTruthy();

        // Delete image
        await sqliteService.deleteImage('test-delete');

        // Verify both metadata and data are deleted
        const metadataAfter = await sqliteService.getAllImageMetadata();
        const imageDataAfter = await sqliteService.getImageData('test-delete');
        expect(metadataAfter).toHaveLength(0);
        expect(imageDataAfter).toBeNull();
    });
});