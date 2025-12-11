import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MasonryImageRenderer } from './MasonryGridImageRenderer';
import type { GeneratedImage, ConverseRequestParams } from '../types';

describe('MasonryImageRenderer - ConverseParams Support', () => {
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

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

    it('should render image with converseParams', () => {
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

        render(
            <MasonryImageRenderer
                item={mockImage}
                displayWidth={300}
                displayHeight={200}
                isVisible={true}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        // Check that the image is rendered
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'data:image/png;base64,test-data');
        expect(image).toHaveAttribute('alt', 'A beautiful sunset over mountains');
    });

    it('should render image without converseParams', () => {
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

        render(
            <MasonryImageRenderer
                item={mockImage}
                displayWidth={300}
                displayHeight={300}
                isVisible={true}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        // Check that the image is rendered
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'data:image/jpeg;base64,test-data');
        expect(image).toHaveAttribute('alt', 'A beautiful landscape');
    });
});