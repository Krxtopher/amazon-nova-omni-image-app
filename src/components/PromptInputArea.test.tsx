import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInputArea } from './PromptInputArea';
import { BedrockImageService } from '@/services/BedrockImageService';
import { useImageStore } from '@/stores/imageStore';


// Mock the image store
vi.mock('@/stores/imageStore', () => ({
    useImageStore: vi.fn(),
}));

describe('PromptInputArea - Submit Handler', () => {
    let mockBedrockService: BedrockImageService;
    let mockAddImage: ReturnType<typeof vi.fn>;
    let mockUpdateImage: ReturnType<typeof vi.fn>;
    let mockClearEditSource: ReturnType<typeof vi.fn>;
    let mockOnError: (error: string) => void;
    let mockOnSuccess: (message: string) => void;

    beforeEach(() => {
        // Reset mocks
        mockAddImage = vi.fn();
        mockUpdateImage = vi.fn();
        mockClearEditSource = vi.fn();
        mockOnError = vi.fn();
        mockOnSuccess = vi.fn();

        // Mock store
        (useImageStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            selectedAspectRatio: '1:1',
            editSource: null,
            setAspectRatio: vi.fn(),
            setEditSource: vi.fn(),
            clearEditSource: mockClearEditSource,
            addImage: mockAddImage,
            updateImage: mockUpdateImage,
        });

        // Mock Bedrock service
        mockBedrockService = {
            generateImage: vi.fn().mockResolvedValue('data:image/png;base64,mockImageData'),
        } as unknown as BedrockImageService;
    });

    it('should create placeholder immediately when submitting', async () => {
        const user = userEvent.setup();

        render(
            <PromptInputArea
                bedrockService={mockBedrockService}
                onError={mockOnError}
                onSuccess={mockOnSuccess}
            />
        );

        // Enter a prompt
        const textarea = screen.getByLabelText(/image generation prompt/i);
        await user.type(textarea, 'A beautiful sunset');

        // Submit
        const submitButton = screen.getByRole('button', { name: /generate image/i });
        await user.click(submitButton);

        // Verify placeholder was added immediately
        await waitFor(() => {
            expect(mockAddImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'A beautiful sunset',
                    status: 'generating',
                    aspectRatio: '1:1',
                })
            );
        });
    });

    it('should update placeholder with generated image on success', async () => {
        const user = userEvent.setup();

        render(
            <PromptInputArea
                bedrockService={mockBedrockService}
                onError={mockOnError}
                onSuccess={mockOnSuccess}
            />
        );

        // Enter a prompt
        const textarea = screen.getByLabelText(/image generation prompt/i);
        await user.type(textarea, 'A beautiful sunset');

        // Submit
        const submitButton = screen.getByRole('button', { name: /generate image/i });
        await user.click(submitButton);

        // Wait for generation to complete
        await waitFor(() => {
            expect(mockUpdateImage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    url: 'data:image/png;base64,mockImageData',
                    status: 'complete',
                })
            );
        });

        // Verify success callback was called
        expect(mockOnSuccess).toHaveBeenCalledWith('Image generated successfully!');
    });

    it('should update placeholder with error on failure', async () => {
        const user = userEvent.setup();
        const errorMessage = 'API error occurred';

        // Mock service to throw error
        mockBedrockService.generateImage = vi.fn().mockRejectedValue(new Error(errorMessage));

        render(
            <PromptInputArea
                bedrockService={mockBedrockService}
                onError={mockOnError}
                onSuccess={mockOnSuccess}
            />
        );

        // Enter a prompt
        const textarea = screen.getByLabelText(/image generation prompt/i);
        await user.type(textarea, 'A beautiful sunset');

        // Submit
        const submitButton = screen.getByRole('button', { name: /generate image/i });
        await user.click(submitButton);

        // Wait for error handling
        await waitFor(() => {
            expect(mockUpdateImage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    status: 'error',
                    error: errorMessage,
                })
            );
        });

        // Verify error callback was called
        expect(mockOnError).toHaveBeenCalledWith(errorMessage);
    });

    it('should call generateImage with correct parameters for new generation', async () => {
        const user = userEvent.setup();

        render(
            <PromptInputArea
                bedrockService={mockBedrockService}
                onError={mockOnError}
                onSuccess={mockOnSuccess}
            />
        );

        // Enter a prompt
        const textarea = screen.getByLabelText(/image generation prompt/i);
        await user.type(textarea, 'A beautiful sunset');

        // Submit
        const submitButton = screen.getByRole('button', { name: /generate image/i });
        await user.click(submitButton);

        // Verify service was called with correct parameters
        await waitFor(() => {
            expect(mockBedrockService.generateImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'A beautiful sunset',
                    aspectRatio: '1:1',
                    editSource: undefined,
                })
            );
        });
    });

    it('should call generateImage with editSource when editing', async () => {
        const user = userEvent.setup();
        const mockEditSource = {
            url: 'data:image/png;base64,mockEditSource',
            aspectRatio: '16:9' as const,
            width: 1344,
            height: 768,
        };

        // Mock store with edit source
        (useImageStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            selectedAspectRatio: '1:1',
            editSource: mockEditSource,
            setAspectRatio: vi.fn(),
            setEditSource: vi.fn(),
            clearEditSource: mockClearEditSource,
            addImage: mockAddImage,
            updateImage: mockUpdateImage,
        });

        render(
            <PromptInputArea
                bedrockService={mockBedrockService}
                onError={mockOnError}
                onSuccess={mockOnSuccess}
            />
        );

        // Enter a prompt
        const textarea = screen.getByLabelText(/image generation prompt/i);
        await user.type(textarea, 'Make it more colorful');

        // Submit
        const submitButton = screen.getByRole('button', { name: /generate image/i });
        await user.click(submitButton);

        // Verify service was called with edit source
        await waitFor(() => {
            expect(mockBedrockService.generateImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'Make it more colorful',
                    aspectRatio: undefined, // Should not include aspectRatio when editing
                    editSource: mockEditSource,
                })
            );
        });

        // Verify success message for editing
        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalledWith('Image edited successfully!');
        });
    });

    it('should clear prompt after successful generation', async () => {
        const user = userEvent.setup();

        render(
            <PromptInputArea
                bedrockService={mockBedrockService}
                onError={mockOnError}
                onSuccess={mockOnSuccess}
            />
        );

        // Enter a prompt
        const textarea = screen.getByLabelText(/image generation prompt/i) as HTMLTextAreaElement;
        await user.type(textarea, 'A beautiful sunset');

        // Submit
        const submitButton = screen.getByRole('button', { name: /generate image/i });
        await user.click(submitButton);

        // Wait for generation to complete
        await waitFor(() => {
            expect(mockUpdateImage).toHaveBeenCalled();
        });

        // Verify prompt was cleared
        expect(textarea.value).toBe('');
    });
});
