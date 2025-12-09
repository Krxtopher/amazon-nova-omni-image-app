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
    let mockDeleteImage: ReturnType<typeof vi.fn>;
    let mockClearEditSource: ReturnType<typeof vi.fn>;
    let mockOnError: (error: string) => void;
    let mockOnSuccess: (message: string) => void;

    beforeEach(() => {
        // Reset mocks
        mockAddImage = vi.fn();
        mockUpdateImage = vi.fn();
        mockDeleteImage = vi.fn();
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
            deleteImage: mockDeleteImage,
        });

        // Mock Bedrock service
        mockBedrockService = {
            generateContent: vi.fn().mockResolvedValue({
                type: 'image',
                imageDataUrl: 'data:image/png;base64,mockImageData',
            }),
        } as unknown as BedrockImageService;
    });

    it('should create placeholder immediately before API call (optimistic UI)', async () => {
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
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Verify placeholder was added immediately (optimistic UI)
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
        const submitButton = screen.getByLabelText(/generate image/i);
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

    it('should remove placeholder on error', async () => {
        const user = userEvent.setup();
        const errorMessage = 'API error occurred';

        // Mock service to throw error
        mockBedrockService.generateContent = vi.fn().mockRejectedValue(new Error(errorMessage));

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
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Verify placeholder was created first
        await waitFor(() => {
            expect(mockAddImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'A beautiful sunset',
                    status: 'generating',
                })
            );
        });

        // Wait for error handling and placeholder removal
        await waitFor(() => {
            expect(mockOnError).toHaveBeenCalledWith(errorMessage);
            expect(mockDeleteImage).toHaveBeenCalledWith(expect.any(String));
        });

        // Verify placeholder was not updated (it was deleted instead)
        expect(mockUpdateImage).not.toHaveBeenCalled();
    });

    it('should call generateContent with correct parameters for new generation', async () => {
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
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Verify service was called with correct parameters
        await waitFor(() => {
            expect(mockBedrockService.generateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'A beautiful sunset',
                    aspectRatio: '1:1',
                    editSource: undefined,
                })
            );
        });
    });

    it('should call generateContent with editSource when editing', async () => {
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
            deleteImage: mockDeleteImage,
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
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Verify service was called with edit source
        await waitFor(() => {
            expect(mockBedrockService.generateContent).toHaveBeenCalledWith(
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

    it('should keep prompt after successful generation', async () => {
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
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Wait for generation to complete
        await waitFor(() => {
            expect(mockUpdateImage).toHaveBeenCalled();
        });

        // Verify prompt was kept (not cleared)
        expect(textarea.value).toBe('A beautiful sunset');
    });

    it('should remove placeholder when receiving text response', async () => {
        const user = userEvent.setup();

        // Mock service to return text response
        mockBedrockService.generateContent = vi.fn().mockResolvedValue({
            type: 'text',
            text: 'This is a text response from the model',
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
        await user.type(textarea, 'A beautiful sunset');

        // Submit
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Verify placeholder was created first
        await waitFor(() => {
            expect(mockAddImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'A beautiful sunset',
                    status: 'generating',
                })
            );
        });

        // Wait for modal to appear and placeholder to be removed
        await waitFor(() => {
            expect(screen.getByText('Model Response')).toBeInTheDocument();
            expect(screen.getByText('This is a text response from the model')).toBeInTheDocument();
            expect(mockDeleteImage).toHaveBeenCalledWith(expect.any(String));
        });

        // Verify placeholder was not updated (it was deleted instead)
        expect(mockUpdateImage).not.toHaveBeenCalled();

        // Verify no error was shown
        expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should allow multiple concurrent requests', async () => {
        const user = userEvent.setup();

        // Mock service with delayed response
        let resolveFirst: (value: { type: 'image'; imageDataUrl: string }) => void;
        let resolveSecond: (value: { type: 'image'; imageDataUrl: string }) => void;
        const firstPromise = new Promise<{ type: 'image'; imageDataUrl: string }>((resolve) => { resolveFirst = resolve; });
        const secondPromise = new Promise<{ type: 'image'; imageDataUrl: string }>((resolve) => { resolveSecond = resolve; });

        mockBedrockService.generateContent = vi.fn()
            .mockReturnValueOnce(firstPromise)
            .mockReturnValueOnce(secondPromise);

        render(
            <PromptInputArea
                bedrockService={mockBedrockService}
                onError={mockOnError}
                onSuccess={mockOnSuccess}
            />
        );

        const textarea = screen.getByLabelText(/image generation prompt/i);
        const submitButton = screen.getByLabelText(/generate image/i);

        // Submit first request
        await user.clear(textarea);
        await user.type(textarea, 'First image');
        await user.click(submitButton);

        // Submit second request while first is still generating
        await user.clear(textarea);
        await user.type(textarea, 'Second image');
        await user.click(submitButton);

        // Verify both requests were made
        expect(mockBedrockService.generateContent).toHaveBeenCalledTimes(2);

        // Resolve both requests
        resolveFirst!({ type: 'image', imageDataUrl: 'data:image/png;base64,firstImage' });
        resolveSecond!({ type: 'image', imageDataUrl: 'data:image/png;base64,secondImage' });

        // Wait for both placeholders to be added
        await waitFor(() => {
            expect(mockAddImage).toHaveBeenCalledTimes(2);
        });

        // Verify both placeholders were added with correct prompts
        expect(mockAddImage).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'First image',
                status: 'generating',
            })
        );
        expect(mockAddImage).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'Second image',
                status: 'generating',
            })
        );

        // Wait for both to complete
        await waitFor(() => {
            expect(mockUpdateImage).toHaveBeenCalledTimes(2);
        });
    });
});
