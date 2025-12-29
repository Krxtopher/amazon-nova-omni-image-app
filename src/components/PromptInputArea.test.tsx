import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInputArea } from './PromptInputArea';
import { BedrockImageService } from '@/services/BedrockImageService';
import { useImageStore } from '@/stores/imageStore';
import { useUIStore, useEditSourceStore } from '@/stores/uiStore';


// Mock the stores
vi.mock('@/stores/imageStore', () => ({
    useImageStore: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
    useUIStore: vi.fn(),
    useEditSourceStore: vi.fn(),
}));

describe('PromptInputArea - Submit Handler', () => {
    let mockBedrockService: BedrockImageService;
    let mockAddImage: ReturnType<typeof vi.fn>;
    let mockAddTextItem: ReturnType<typeof vi.fn>;
    let mockUpdateImage: ReturnType<typeof vi.fn>;
    let mockDeleteImage: ReturnType<typeof vi.fn>;
    let mockClearEditSource: ReturnType<typeof vi.fn>;
    let mockOnError: (error: string) => void;
    let mockOnSuccess: (message: string) => void;
    let originalImage: typeof Image;

    beforeEach(() => {
        // Reset mocks
        mockAddImage = vi.fn();
        mockAddTextItem = vi.fn();
        mockUpdateImage = vi.fn();
        mockDeleteImage = vi.fn();
        mockClearEditSource = vi.fn();
        mockOnError = vi.fn();
        mockOnSuccess = vi.fn();

        // Store original Image constructor
        originalImage = global.Image;

        // Mock Image constructor for all tests
        global.Image = class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            naturalWidth = 1024;
            naturalHeight = 1024;

            set src(_value: string) {
                // Simulate successful image load
                setTimeout(() => {
                    if (this.onload) {
                        this.onload();
                    }
                }, 0);
            }
        } as any;

        // Mock stores
        (useImageStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            addImage: mockAddImage,
            addTextItem: mockAddTextItem,
            updateImage: mockUpdateImage,
            deleteImage: mockDeleteImage,
        });

        (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            selectedAspectRatio: '1:1',
            setAspectRatio: vi.fn(),
            selectedPromptEnhancement: 'off',
            setPromptEnhancement: vi.fn(),
        });

        (useEditSourceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            editSource: null,
            setEditSource: vi.fn(),
            clearEditSource: mockClearEditSource,
        });

        // Mock Bedrock service
        mockBedrockService = {
            generateContent: vi.fn().mockResolvedValue({
                type: 'image',
                imageDataUrl: 'data:image/png;base64,mockImageData',
                converseParams: {},
                fullResponse: { output: { message: { content: [] } } },
            }),
        } as unknown as BedrockImageService;
    });

    afterEach(() => {
        // Restore original Image constructor
        global.Image = originalImage;
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

        // Verify service was called with correct parameters including aspect ratio in prompt
        await waitFor(() => {
            expect(mockBedrockService.generateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'A beautiful sunset(1:1)',
                    aspectRatio: '1:1',
                    editSource: undefined,
                    promptEnhancement: 'off',
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

        // Mock stores with edit source
        (useEditSourceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            editSource: mockEditSource,
            setEditSource: vi.fn(),
            clearEditSource: mockClearEditSource,
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
            expect(mockOnSuccess).toHaveBeenCalledWith('Image edited successfully! Image remains selected for more edits.');
        });

        // Verify edit source was NOT cleared after successful generation
        expect(mockClearEditSource).not.toHaveBeenCalled();
    });

    it('should keep edit source selected after text response', async () => {
        const user = userEvent.setup();
        const mockEditSource = {
            url: 'data:image/png;base64,mockEditSource',
            aspectRatio: '16:9' as const,
            width: 1344,
            height: 768,
        };

        // Mock stores with edit source
        (useEditSourceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            editSource: mockEditSource,
            setEditSource: vi.fn(),
            clearEditSource: mockClearEditSource,
        });

        // Mock service to return text response
        mockBedrockService.generateContent = vi.fn().mockResolvedValue({
            type: 'text',
            text: 'This is a text response from the model',
            converseParams: {},
            fullResponse: { output: { message: { content: [{ text: 'This is a text response from the model' }] } } },
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

        // Wait for placeholder to be removed and modal to be shown
        await waitFor(() => {
            expect(mockDeleteImage).toHaveBeenCalledWith(expect.any(String));
        });

        // Verify edit source was NOT cleared after text response
        expect(mockClearEditSource).not.toHaveBeenCalled();
    });

    it('should handle error response type (e.g., unexpected stopReason)', async () => {
        const user = userEvent.setup();

        // Mock service to return error response
        mockBedrockService.generateContent = vi.fn().mockResolvedValue({
            type: 'error',
            error: 'Unexpected stop reason: content_filtered',
            converseParams: {
                modelId: 'us.amazon.nova-2-omni-v1:0',
                messages: [{ role: 'user', content: [{ text: 'Test prompt' }] }],
            },
            fullResponse: { stopReason: 'content_filtered', output: { message: { content: [] } } },
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
        await user.type(textarea, 'Test prompt');

        // Submit
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Wait for the error to be processed
        await waitFor(() => {
            expect(mockUpdateImage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    status: 'error',
                    error: 'Unexpected stop reason: content_filtered',
                    converseParams: expect.any(Object),
                })
            );
        });

        // Verify edit source was NOT cleared after error response
        expect(mockClearEditSource).not.toHaveBeenCalled();
    });

    it('should update aspect ratio when actual image dimensions differ from prospective ratio', async () => {
        const user = userEvent.setup();

        // Create a mock image that will have 16:9 dimensions when loaded
        const mockImageDataUrl = 'data:image/png;base64,mockImageData';
        mockBedrockService.generateContent = vi.fn().mockResolvedValue({
            type: 'image',
            imageDataUrl: mockImageDataUrl,
            converseParams: {},
            fullResponse: { output: { message: { content: [] } } },
        });

        // Override the default Image mock to simulate loading an image with 16:9 dimensions
        global.Image = class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            naturalWidth = 1920;
            naturalHeight = 1080;

            set src(_value: string) {
                // Simulate successful image load
                setTimeout(() => {
                    if (this.onload) {
                        this.onload();
                    }
                }, 0);
            }
        } as any;

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

        // Verify placeholder was created with prospective 1:1 aspect ratio
        await waitFor(() => {
            expect(mockAddImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'A beautiful sunset',
                    status: 'generating',
                    aspectRatio: '1:1',
                    width: 1024,
                    height: 1024,
                })
            );
        });

        // Wait for generation to complete and aspect ratio to be corrected
        await waitFor(() => {
            expect(mockUpdateImage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    url: mockImageDataUrl,
                    status: 'complete',
                    aspectRatio: '16:9', // Should be corrected to actual aspect ratio
                    width: 1920, // Should be updated to actual dimensions
                    height: 1080,
                    converseParams: {},
                })
            );
        });
    });

    it('should close drawers when submitting via button click', async () => {
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

        // Open aspect ratio drawer by clicking the aspect ratio selector
        const aspectRatioButton = screen.getByLabelText(/current aspect ratio/i);
        await user.click(aspectRatioButton);

        // Verify drawer is expanded (aspect ratio options should be visible)
        expect(screen.getByText('Any')).toBeInTheDocument();

        // Submit the form
        const submitButton = screen.getByLabelText(/generate image/i);
        await user.click(submitButton);

        // Verify drawer is closed (aspect ratio options should not be visible)
        await waitFor(() => {
            expect(screen.queryByText('Any')).not.toBeInTheDocument();
        });
    });

    it('should close drawers when clicking on other parts of the input bar', async () => {
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

        // Open aspect ratio drawer by clicking the aspect ratio selector
        const aspectRatioButton = screen.getByLabelText(/current aspect ratio/i);
        await user.click(aspectRatioButton);

        // Verify drawer is expanded (aspect ratio options should be visible)
        expect(screen.getByText('Any')).toBeInTheDocument();

        // Click on the textarea (which is part of the input bar but not the tray)
        await user.click(textarea);

        // Verify drawer is closed (aspect ratio options should not be visible)
        await waitFor(() => {
            expect(screen.queryByText('Any')).not.toBeInTheDocument();
        });
    });

    it('should close drawers when submitting via Enter key', async () => {
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

        // Open aspect ratio drawer by clicking the aspect ratio selector
        const aspectRatioButton = screen.getByLabelText(/current aspect ratio/i);
        await user.click(aspectRatioButton);

        // Verify drawer is expanded (aspect ratio options should be visible)
        expect(screen.getByText('Any')).toBeInTheDocument();

        // Focus back on textarea and submit via Enter
        await user.click(textarea);
        await user.keyboard('{Enter}');

        // Verify drawer is closed (aspect ratio options should not be visible)
        await waitFor(() => {
            expect(screen.queryByText('Any')).not.toBeInTheDocument();
        });
    });
});