import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Lightbox } from './Lightbox';
import { useImageStore } from '../stores/imageStore';
import type { GeneratedImage } from '../types';

// Mock the image store
vi.mock('../stores/imageStore');
const mockUseImageStore = vi.mocked(useImageStore);

// Mock the useImageData hook
vi.mock('../hooks/useImageData', () => ({
    useImageData: vi.fn((imageId: string) => ({
        imageUrl: imageId === 'test-image-1' ? 'data:image/png;base64,test1' : 'data:image/png;base64,test2',
        isLoading: false,
        error: null
    }))
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ imageId: 'test-image-1' }),
    };
});

describe('Lightbox', () => {
    const mockImages: GeneratedImage[] = [
        {
            id: 'test-image-1',
            url: 'data:image/png;base64,test1',
            prompt: 'Test image 1',
            status: 'complete',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            createdAt: new Date('2024-01-01'),
        },
        {
            id: 'test-image-2',
            url: 'data:image/png;base64,test2',
            prompt: 'Test image 2',
            status: 'complete',
            aspectRatio: '16:9',
            width: 1344,
            height: 768,
            createdAt: new Date('2024-01-02'),
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseImageStore.mockReturnValue({
            images: mockImages,
            textItems: [],
            isGenerating: false,
            isLoading: false,
            hasMoreImages: false,
            isLoadingMore: false,
            totalImageCount: mockImages.length,
            imageDataCache: new Map(),
            cacheAccessTimes: new Map(),
            addImage: vi.fn(),
            addTextItem: vi.fn(),
            updateImage: vi.fn(),
            deleteImage: vi.fn(),
            deleteTextItem: vi.fn(),
            loadImages: vi.fn(),
            loadMoreImages: vi.fn(),
            loadImageData: vi.fn().mockResolvedValue('data:image/png;base64,test'),
            clearImageDataCache: vi.fn(),
            getAllItems: vi.fn().mockReturnValue([]),
            getItemsPaginated: vi.fn().mockResolvedValue([]),
            getTotalItemCount: vi.fn().mockReturnValue(0),
            initialize: vi.fn()
        } as any);
    });

    const renderLightbox = () => {
        return render(
            <BrowserRouter>
                <Lightbox />
            </BrowserRouter>
        );
    };

    it('should render image and details correctly', () => {
        renderLightbox();

        // Check if image is rendered
        const image = screen.getByAltText('Test image 1');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'data:image/png;base64,test1');

        // Check if prompt is displayed
        expect(screen.getByText('Test image 1')).toBeInTheDocument();

        // Check if details are displayed
        expect(screen.getByText('1:1')).toBeInTheDocument();
        expect(screen.getByText('1024 × 1024')).toBeInTheDocument();
    });

    it('should show image counter', () => {
        renderLightbox();

        expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('should close lightbox when close button is clicked', () => {
        renderLightbox();

        const closeButton = screen.getByLabelText('Close lightbox');
        fireEvent.click(closeButton);

        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should close lightbox on Escape key', () => {
        renderLightbox();

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate to next image on right arrow key', () => {
        renderLightbox();

        fireEvent.keyDown(document, { key: 'ArrowRight' });

        expect(mockNavigate).toHaveBeenCalledWith('/image/test-image-2');
    });

    it('should show download and copy buttons', () => {
        renderLightbox();

        expect(screen.getByText('Download')).toBeInTheDocument();
        expect(screen.getByLabelText('Copy prompt')).toBeInTheDocument();
    });

    it('should show navigation arrows when appropriate', () => {
        renderLightbox();

        // Should show next arrow (since we're on first image)
        expect(screen.getByLabelText('Next image')).toBeInTheDocument();

        // Should not show previous arrow (since we're on first image)
        expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
    });

    it('should show error message when image not found', () => {
        // Mock empty images array
        mockUseImageStore.mockReturnValue({
            images: [],
        } as any);

        renderLightbox();

        expect(screen.getByText('Image not found')).toBeInTheDocument();
        expect(screen.getByText('Return to Gallery')).toBeInTheDocument();
    });
});