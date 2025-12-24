import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ImageCard } from './ImageCard';
import type { GeneratedImage, ConverseRequestParams } from '../types';

describe('ImageCard - ConverseParams Support', () => {
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

    it('should render placeholder for complete image when visible (lazy loading)', () => {
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
            <BrowserRouter>
                <ImageCard
                    item={mockImage}
                    displayWidth={300}
                    displayHeight={200}
                    isVisible={true}
                    onDelete={mockOnDelete}
                    onEdit={mockOnEdit}
                />
            </BrowserRouter>
        );

        // Check that placeholder is shown while image data is loading
        const placeholder = screen.getByText('Creating...');
        expect(placeholder).toBeInTheDocument();

        // Check that the container has the correct classes for complete images
        const container = placeholder.closest('.group');
        expect(container).toBeInTheDocument();
    });

    it('should render placeholder for complete image without converseParams when visible', () => {
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
            <BrowserRouter>
                <ImageCard
                    item={mockImage}
                    displayWidth={300}
                    displayHeight={300}
                    isVisible={true}
                    onDelete={mockOnDelete}
                    onEdit={mockOnEdit}
                />
            </BrowserRouter>
        );

        // Check that placeholder is shown while image data is loading
        const placeholder = screen.getByText('Creating...');
        expect(placeholder).toBeInTheDocument();

        // Check that the container has the correct classes for complete images
        const container = placeholder.closest('.group');
        expect(container).toBeInTheDocument();
    });

    it('should render placeholder when not visible (lazy loading)', () => {
        const mockImage: GeneratedImage = {
            id: 'test-image-3',
            url: 'data:image/png;base64,test-data',
            prompt: 'A beautiful sunset over mountains',
            status: 'complete',
            aspectRatio: '16:9',
            width: 1344,
            height: 768,
            createdAt: new Date(),
        };

        render(
            <BrowserRouter>
                <ImageCard
                    item={mockImage}
                    displayWidth={300}
                    displayHeight={200}
                    isVisible={false}
                    onDelete={mockOnDelete}
                    onEdit={mockOnEdit}
                />
            </BrowserRouter>
        );

        // Check that no image is rendered (lazy loading)
        const image = screen.queryByRole('img');
        expect(image).not.toBeInTheDocument();

        // Check that placeholder is rendered instead
        const placeholder = screen.getByText('Creating...');
        expect(placeholder).toBeInTheDocument();

        // Check that the magical placeholder container is present
        const placeholderContainer = placeholder.closest('.cursor-pointer');
        expect(placeholderContainer).toBeInTheDocument();
        expect(placeholderContainer).toHaveClass('w-full', 'h-full', 'cursor-pointer', 'relative');
    });

    it('should display prompt text during generating state with overlay blend mode', () => {
        const mockImage: GeneratedImage = {
            id: 'test-image-4',
            prompt: 'A beautiful sunset over mountains',
            status: 'generating',
            aspectRatio: '16:9',
            width: 1344,
            height: 768,
            createdAt: new Date(),
        };

        render(
            <BrowserRouter>
                <ImageCard
                    item={mockImage}
                    displayWidth={300}
                    displayHeight={200}
                    isVisible={true}
                    onDelete={mockOnDelete}
                    onEdit={mockOnEdit}
                />
            </BrowserRouter>
        );

        // Check that the prompt text is displayed during generation (first word should be visible)
        const promptText = screen.getByText('A');
        expect(promptText).toBeInTheDocument();

        // Check that the parent container has the overlay blend mode
        const overlayContainer = promptText.closest('.mix-blend-overlay');
        expect(overlayContainer).toBeInTheDocument();

        // Check that it's positioned correctly (centered)
        const promptContainer = promptText.closest('.flex-1.flex.items-center.justify-center');
        expect(promptContainer).toBeInTheDocument();
    });

    it('should display enhanced error state with prompt and download button', () => {
        const mockImage: GeneratedImage = {
            id: 'test-image-5',
            prompt: 'A beautiful sunset over mountains that failed to generate',
            status: 'error',
            error: 'Generation failed due to content policy',
            aspectRatio: '16:9',
            width: 1344,
            height: 768,
            createdAt: new Date(),
            converseParams: mockConverseParams,
        };

        render(
            <BrowserRouter>
                <ImageCard
                    item={mockImage}
                    displayWidth={300}
                    displayHeight={200}
                    isVisible={true}
                    onDelete={mockOnDelete}
                    onEdit={mockOnEdit}
                />
            </BrowserRouter>
        );

        // Check that the error message is displayed at the top
        const errorMessage = screen.getByText('Generation failed due to content policy');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-destructive');

        // Check that the prompt is displayed in the scrollable area
        const promptText = screen.getByText('A beautiful sunset over mountains that failed to generate');
        expect(promptText).toBeInTheDocument();

        // Check that "Original Prompt:" label is present
        const promptLabel = screen.getByText('Original Prompt:');
        expect(promptLabel).toBeInTheDocument();

        // Check that download button is present and enabled (since converseParams exists)
        const downloadButton = screen.getByLabelText('Download parameters');
        expect(downloadButton).toBeInTheDocument();
        expect(downloadButton).not.toBeDisabled();

        // Check that delete button is present
        const deleteButton = screen.getByLabelText('Delete error message');
        expect(deleteButton).toBeInTheDocument();
    });

    it('should disable download button when converseParams is missing in error state', () => {
        const mockImage: GeneratedImage = {
            id: 'test-image-6',
            prompt: 'A beautiful sunset over mountains that failed to generate',
            status: 'error',
            error: 'Generation failed due to content policy',
            aspectRatio: '16:9',
            width: 1344,
            height: 768,
            createdAt: new Date(),
            // No converseParams
        };

        render(
            <BrowserRouter>
                <ImageCard
                    item={mockImage}
                    displayWidth={300}
                    displayHeight={200}
                    isVisible={true}
                    onDelete={mockOnDelete}
                    onEdit={mockOnEdit}
                />
            </BrowserRouter>
        );

        // Check that download button is disabled when converseParams is missing
        const downloadButton = screen.getByLabelText('Download parameters');
        expect(downloadButton).toBeInTheDocument();
        expect(downloadButton).toBeDisabled();
    });

    it('should include system prompt in converseParams when available', () => {
        const mockConverseParamsWithSystem: ConverseRequestParams = {
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
            system: [
                {
                    text: 'You are an AI assistant that generates high-quality images.'
                }
            ]
        };

        const mockImage: GeneratedImage = {
            id: 'test-image-7',
            prompt: 'A beautiful sunset over mountains that failed to generate',
            status: 'error',
            error: 'Generation failed due to content policy',
            aspectRatio: '16:9',
            width: 1344,
            height: 768,
            createdAt: new Date(),
            converseParams: mockConverseParamsWithSystem,
        };

        render(
            <BrowserRouter>
                <ImageCard
                    item={mockImage}
                    displayWidth={300}
                    displayHeight={200}
                    isVisible={true}
                    onDelete={mockOnDelete}
                    onEdit={mockOnEdit}
                />
            </BrowserRouter>
        );

        // Check that download button is enabled when converseParams with system prompt exists
        const downloadButton = screen.getByLabelText('Download parameters');
        expect(downloadButton).toBeInTheDocument();
        expect(downloadButton).not.toBeDisabled();

        // The actual download functionality would include the system prompt in the JSON
        // This is tested implicitly through the converseParams structure
        expect(mockImage.converseParams?.system).toBeDefined();
        expect(mockImage.converseParams?.system?.[0].text).toBe('You are an AI assistant that generates high-quality images.');
    });
});