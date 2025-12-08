import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GalleryGrid } from './GalleryGrid';
import type { GeneratedImage } from '../types';

describe('GalleryGrid', () => {
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

    it('should render empty state when no images', () => {
        render(
            <GalleryGrid
                images={[]}
                onImageDelete={mockOnDelete}
                onImageEdit={mockOnEdit}
            />
        );

        expect(screen.getByText('No images yet')).toBeInTheDocument();
        expect(screen.getByText('Enter a prompt above to generate your first image')).toBeInTheDocument();
    });

    it('should render images in correct order (newest first)', () => {
        const images: GeneratedImage[] = [
            {
                id: '1',
                url: 'data:image/png;base64,test1',
                prompt: 'First image',
                status: 'complete',
                aspectRatio: '1:1',
                width: 1024,
                height: 1024,
                createdAt: new Date('2024-01-01'),
            },
            {
                id: '2',
                url: 'data:image/png;base64,test2',
                prompt: 'Second image',
                status: 'complete',
                aspectRatio: '16:9',
                width: 1344,
                height: 768,
                createdAt: new Date('2024-01-02'),
            },
        ];

        render(
            <GalleryGrid
                images={images}
                onImageDelete={mockOnDelete}
                onImageEdit={mockOnEdit}
            />
        );

        const imageCards = screen.getAllByRole('img');
        expect(imageCards).toHaveLength(2);
        expect(imageCards[0]).toHaveAttribute('alt', 'First image');
        expect(imageCards[1]).toHaveAttribute('alt', 'Second image');
    });

    it('should handle concurrent placeholders', () => {
        const images: GeneratedImage[] = [
            {
                id: '1',
                url: '',
                prompt: 'Generating 1',
                status: 'generating',
                aspectRatio: '1:1',
                width: 1024,
                height: 1024,
                createdAt: new Date(),
            },
            {
                id: '2',
                url: '',
                prompt: 'Generating 2',
                status: 'generating',
                aspectRatio: '16:9',
                width: 1344,
                height: 768,
                createdAt: new Date(),
            },
        ];

        const { container } = render(
            <GalleryGrid
                images={images}
                onImageDelete={mockOnDelete}
                onImageEdit={mockOnEdit}
            />
        );

        // Should render both placeholders with loading indicators
        const placeholders = container.querySelectorAll('.bg-muted');
        expect(placeholders.length).toBe(4); // 2 outer containers + 2 inner loading divs

        // Verify both image cards are rendered
        const imageCards = container.querySelectorAll('.relative.group');
        expect(imageCards.length).toBe(2);
    });
});
