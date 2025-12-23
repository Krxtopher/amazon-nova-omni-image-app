/**
 * End-to-End Integration Tests for Streaming Prompt Enhancement System
 * 
 * Tests complete user flows from prompt submission to display completion,
 * verifying backward compatibility and error scenarios.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { StreamingPromptDisplay } from '../components/StreamingPromptDisplay';
import { ImageCard } from '../components/ImageCard';
import { PromptInputArea } from '../components/PromptInputArea';
import { StreamingDisplayConfigProvider } from '../contexts/StreamingDisplayConfigContext';
import { BedrockServiceProvider } from '../contexts/BedrockServiceContext';
import { BedrockImageService } from '../services/BedrockImageService';
import type { GeneratedImage, PromptEnhancement } from '../types';

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
        send: vi.fn(),
        config: {
            region: vi.fn().mockResolvedValue('us-east-1')
        }
    })),
    ConverseCommand: vi.fn().mockImplementation((params) => ({ input: params })),
    ConverseStreamCommand: vi.fn().mockImplementation((params) => ({ input: params }))
}));

// Mock image store
const mockImageStore = {
    images: [],
    addImage: vi.fn(),
    updateImage: vi.fn(),
    deleteImage: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    hasMoreImages: false,
    isLoadingMore: false,
    loadMoreImages: vi.fn(),
    loadedImageCount: 0,
};

vi.mock('../stores/imageStore', () => ({
    useImageStore: vi.fn(() => mockImageStore)
}));

// Mock UI store
const mockUIStore = {
    selectedAspectRatio: '1:1' as const,
    selectedPromptEnhancement: 'standard' as PromptEnhancement,
    layoutMode: 'vertical' as const,
    setAspectRatio: vi.fn(),
    setPromptEnhancement: vi.fn(),
};

const mockEditSourceStore = {
    editSource: null,
    setEditSource: vi.fn(),
    clearEditSource: vi.fn(),
};

vi.mock('../stores/uiStore', () => ({
    useUIStore: vi.fn(() => mockUIStore),
    useEditSourceStore: vi.fn(() => mockEditSourceStore)
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
    // Create a mock client that matches the expected interface
    const mockClient = {
        send: vi.fn(),
        config: {
            region: vi.fn().mockResolvedValue('us-east-1')
        }
    };

    const mockBedrockService = new BedrockImageService({
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test'
        }
    });

    // Replace the client with our mock
    (mockBedrockService as any).client = mockClient;

    return (
        <BrowserRouter>
            <StreamingDisplayConfigProvider>
                <BedrockServiceProvider service={mockBedrockService}>
                    {children}
                </BedrockServiceProvider>
            </StreamingDisplayConfigProvider>
        </BrowserRouter>
    );
}

describe('Streaming Prompt Enhancement End-to-End Integration', () => {
    let mockSend: any;
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
        user = userEvent.setup();

        // Reset all mocks
        vi.clearAllMocks();

        // Setup mock client
        const mockClient = {
            send: vi.fn(),
            config: {
                region: vi.fn().mockResolvedValue('us-east-1')
            }
        };
        mockSend = mockClient.send;

        // Reset store mocks
        Object.assign(mockImageStore, {
            images: [],
            addImage: vi.fn(),
            updateImage: vi.fn(),
            deleteImage: vi.fn(),
            initialize: vi.fn().mockResolvedValue(undefined),
            isLoading: false,
            hasMoreImages: false,
            isLoadingMore: false,
            loadMoreImages: vi.fn(),
            loadedImageCount: 0,
        });

        Object.assign(mockUIStore, {
            selectedAspectRatio: '1:1' as const,
            selectedPromptEnhancement: 'standard' as PromptEnhancement,
            layoutMode: 'vertical' as const,
            setAspectRatio: vi.fn(),
            setPromptEnhancement: vi.fn(),
        });

        Object.assign(mockEditSourceStore, {
            editSource: null,
            setEditSource: vi.fn(),
            clearEditSource: vi.fn(),
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('Complete User Flow: Prompt Submission to Display', () => {
        it('should handle complete flow with streaming enhancement enabled', async () => {
            const originalPrompt = 'A beautiful sunset';
            const enhancedPrompt = 'A breathtaking sunset with vibrant orange and pink hues, dramatic clouds, professional photography';

            // Mock streaming enhancement response
            const mockStreamResponse = {
                stream: {
                    async *[Symbol.asyncIterator]() {
                        // Simulate streaming tokens
                        const tokens = enhancedPrompt.split(' ');
                        for (const token of tokens) {
                            yield {
                                contentBlockDelta: {
                                    delta: { text: token + ' ' }
                                }
                            };
                        }
                        yield { messageStop: {} };
                    }
                }
            };

            // Mock image generation response
            const mockImageResponse = {
                output: {
                    message: {
                        content: [{
                            image: {
                                format: 'png',
                                source: {
                                    bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
                                }
                            }
                        }]
                    }
                },
                stopReason: 'end_turn'
            };

            mockSend
                .mockResolvedValueOnce(mockStreamResponse) // Streaming enhancement
                .mockResolvedValueOnce(mockImageResponse); // Image generation

            render(
                <TestWrapper>
                    <PromptInputArea
                        bedrockService={new BedrockImageService({
                            region: 'us-east-1',
                            credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
                        })}
                        onSuccess={vi.fn()}
                        onError={vi.fn()}
                        onActiveRequestsChange={vi.fn()}
                    />
                </TestWrapper>
            );

            // Find and fill the prompt input
            const promptInput = screen.getByLabelText(/image generation prompt/i);
            await user.type(promptInput, originalPrompt);

            // Submit the form
            const submitButton = screen.getByLabelText(/generate image/i);
            await user.click(submitButton);

            // Verify that the image store was called to add a placeholder
            await waitFor(() => {
                expect(mockImageStore.addImage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        prompt: originalPrompt,
                        status: 'generating',
                        aspectRatio: '1:1'
                    })
                );
            });

            // Verify that the image was updated with enhanced prompt
            await waitFor(() => {
                expect(mockImageStore.updateImage).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        prompt: enhancedPrompt.trim()
                    })
                );
            }, { timeout: 5000 });

            // Verify final image update with completion
            await waitFor(() => {
                expect(mockImageStore.updateImage).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        status: 'complete',
                        url: expect.stringContaining('data:image/png;base64,')
                    })
                );
            });
        });

        it('should handle complete flow with enhancement disabled', async () => {
            const originalPrompt = 'A simple cat';

            // Update mock to have enhancement off
            mockUIStore.selectedPromptEnhancement = 'off';

            // Mock only image generation (no enhancement)
            const mockImageResponse = {
                output: {
                    message: {
                        content: [{
                            image: {
                                format: 'png',
                                source: {
                                    bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
                                }
                            }
                        }]
                    }
                },
                stopReason: 'end_turn'
            };

            mockSend.mockResolvedValueOnce(mockImageResponse);

            render(
                <TestWrapper>
                    <PromptInputArea
                        bedrockService={new BedrockImageService({
                            region: 'us-east-1',
                            credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
                        })}
                        onSuccess={vi.fn()}
                        onError={vi.fn()}
                        onActiveRequestsChange={vi.fn()}
                    />
                </TestWrapper>
            );

            const promptInput = screen.getByLabelText(/image generation prompt/i);
            await user.type(promptInput, originalPrompt);

            const submitButton = screen.getByLabelText(/generate image/i);
            await user.click(submitButton);

            // Verify placeholder creation with original prompt
            await waitFor(() => {
                expect(mockImageStore.addImage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        prompt: originalPrompt,
                        status: 'generating'
                    })
                );
            });

            // Verify completion without enhancement
            await waitFor(() => {
                expect(mockImageStore.updateImage).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        status: 'complete',
                        url: expect.stringContaining('data:image/png;base64,')
                    })
                );
            });

            // Verify no streaming enhancement call was made
            expect(mockSend).toHaveBeenCalledTimes(1);
        });
    });

    describe('StreamingPromptDisplay Component Integration', () => {
        it('should display words sequentially with proper timing', async () => {
            const testPrompt = 'Hello world test';

            render(
                <TestWrapper>
                    <StreamingPromptDisplay
                        originalPrompt={testPrompt}
                        enhancementType="off"
                        onDisplayComplete={vi.fn()}
                    />
                </TestWrapper>
            );

            // Initially should show loading or first word
            await waitFor(() => {
                expect(screen.getByText(/hello/i)).toBeInTheDocument();
            });

            // Eventually all words should be visible
            await waitFor(() => {
                expect(screen.getByText(/hello/i)).toBeInTheDocument();
                expect(screen.getByText(/world/i)).toBeInTheDocument();
                expect(screen.getByText(/test/i)).toBeInTheDocument();
            }, { timeout: 5000 });
        });

        it('should handle enhancement completion callback', async () => {
            const onEnhancementComplete = vi.fn();
            const onDisplayComplete = vi.fn();

            render(
                <TestWrapper>
                    <StreamingPromptDisplay
                        originalPrompt="Test prompt"
                        enhancementType="off"
                        onEnhancementComplete={onEnhancementComplete}
                        onDisplayComplete={onDisplayComplete}
                    />
                </TestWrapper>
            );

            // Wait for display to complete
            await waitFor(() => {
                expect(onDisplayComplete).toHaveBeenCalled();
            }, { timeout: 5000 });
        });
    });

    describe('ImageCard Integration with Streaming Display', () => {
        it('should show streaming display for generating images', async () => {
            const mockImage: GeneratedImage = {
                id: 'test-image-1',
                url: '',
                prompt: 'A beautiful landscape',
                status: 'generating',
                aspectRatio: '16:9',
                width: 1024,
                height: 576,
                createdAt: new Date(),
            };

            render(
                <TestWrapper>
                    <ImageCard
                        item={mockImage}
                        displayWidth={300}
                        displayHeight={200}
                        isVisible={true}
                        onDelete={vi.fn()}
                        onEdit={vi.fn()}
                        enableStreamingDisplay={true}
                        enhancementType="standard"
                    />
                </TestWrapper>
            );

            // Should show the prompt with streaming display
            await waitFor(() => {
                expect(screen.getByText(/beautiful/i)).toBeInTheDocument();
            });

            // Should show generating status
            expect(screen.getByText(/generating/i)).toBeInTheDocument();
        });

        it('should show completed image without streaming display', async () => {
            const mockImage: GeneratedImage = {
                id: 'test-image-2',
                url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                prompt: 'A completed image',
                status: 'complete',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
            };

            render(
                <TestWrapper>
                    <ImageCard
                        item={mockImage}
                        displayWidth={300}
                        displayHeight={300}
                        isVisible={true}
                        onDelete={vi.fn()}
                        onEdit={vi.fn()}
                        enableStreamingDisplay={true}
                        enhancementType="standard"
                    />
                </TestWrapper>
            );

            // Should show the completed image
            await waitFor(() => {
                const image = screen.getByRole('img');
                expect(image).toHaveAttribute('src', mockImage.url);
            });
        });
    });

    describe('Error Scenarios and Recovery', () => {
        it('should handle streaming enhancement errors gracefully', async () => {
            const originalPrompt = 'Test prompt for error';

            // Mock streaming error
            mockSend.mockRejectedValueOnce(new Error('Network error'));

            render(
                <TestWrapper>
                    <StreamingPromptDisplay
                        originalPrompt={originalPrompt}
                        enhancementType="standard"
                        onDisplayComplete={vi.fn()}
                    />
                </TestWrapper>
            );

            // Should fallback to original prompt display
            await waitFor(() => {
                expect(screen.getByText(/test/i)).toBeInTheDocument();
                expect(screen.getByText(/prompt/i)).toBeInTheDocument();
            }, { timeout: 5000 });
        });

        it('should handle image generation errors in complete flow', async () => {
            const originalPrompt = 'Error test prompt';

            // Mock successful enhancement but failed image generation
            const mockStreamResponse = {
                stream: {
                    async *[Symbol.asyncIterator]() {
                        yield {
                            contentBlockDelta: {
                                delta: { text: 'Enhanced ' + originalPrompt }
                            }
                        };
                        yield { messageStop: {} };
                    }
                }
            };

            mockSend
                .mockResolvedValueOnce(mockStreamResponse) // Successful enhancement
                .mockRejectedValueOnce(new Error('Image generation failed')); // Failed image generation

            render(
                <TestWrapper>
                    <PromptInputArea
                        bedrockService={new BedrockImageService({
                            region: 'us-east-1',
                            credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
                        })}
                        onSuccess={vi.fn()}
                        onError={vi.fn()}
                        onActiveRequestsChange={vi.fn()}
                    />
                </TestWrapper>
            );

            const promptInput = screen.getByLabelText(/image generation prompt/i);
            await user.type(promptInput, originalPrompt);

            const submitButton = screen.getByLabelText(/generate image/i);
            await user.click(submitButton);

            // Should create placeholder
            await waitFor(() => {
                expect(mockImageStore.addImage).toHaveBeenCalled();
            });

            // Should update with error status
            await waitFor(() => {
                expect(mockImageStore.updateImage).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        status: 'error',
                        error: expect.stringContaining('Image generation failed')
                    })
                );
            });
        });
    });

    describe('Backward Compatibility', () => {
        it('should work with existing ImageCard props when streaming is disabled', async () => {
            const mockImage: GeneratedImage = {
                id: 'backward-compat-test',
                url: 'data:image/png;base64,test',
                prompt: 'Backward compatibility test',
                status: 'complete',
                aspectRatio: '1:1',
                width: 512,
                height: 512,
                createdAt: new Date(),
            };

            render(
                <TestWrapper>
                    <ImageCard
                        item={mockImage}
                        displayWidth={300}
                        displayHeight={300}
                        isVisible={true}
                        onDelete={vi.fn()}
                        onEdit={vi.fn()}
                        enableStreamingDisplay={false} // Disabled
                    />
                </TestWrapper>
            );

            // Should show static prompt without streaming
            expect(screen.getByText(/backward compatibility test/i)).toBeInTheDocument();
        });

        it('should maintain existing PromptInputArea behavior', async () => {
            const onSuccess = vi.fn();
            const onError = vi.fn();
            const onActiveRequestsChange = vi.fn();

            render(
                <TestWrapper>
                    <PromptInputArea
                        bedrockService={new BedrockImageService({
                            region: 'us-east-1',
                            credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
                        })}
                        onSuccess={onSuccess}
                        onError={onError}
                        onActiveRequestsChange={onActiveRequestsChange}
                    />
                </TestWrapper>
            );

            // Should render all expected elements
            expect(screen.getByLabelText(/image generation prompt/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/generate image/i)).toBeInTheDocument();

            // Should call active requests change on mount
            expect(onActiveRequestsChange).toHaveBeenCalledWith(0);
        });
    });

    describe('Multiple Concurrent Displays', () => {
        it('should handle multiple ImageCards with independent streaming displays', async () => {
            const mockImages: GeneratedImage[] = [
                {
                    id: 'concurrent-1',
                    url: '',
                    prompt: 'First concurrent image',
                    status: 'generating',
                    aspectRatio: '1:1',
                    width: 512,
                    height: 512,
                    createdAt: new Date(),
                },
                {
                    id: 'concurrent-2',
                    url: '',
                    prompt: 'Second concurrent image',
                    status: 'generating',
                    aspectRatio: '16:9',
                    width: 1024,
                    height: 576,
                    createdAt: new Date(),
                }
            ];

            render(
                <TestWrapper>
                    <div>
                        {mockImages.map(image => (
                            <ImageCard
                                key={image.id}
                                item={image}
                                displayWidth={300}
                                displayHeight={200}
                                isVisible={true}
                                onDelete={vi.fn()}
                                onEdit={vi.fn()}
                                enableStreamingDisplay={true}
                                enhancementType="standard"
                            />
                        ))}
                    </div>
                </TestWrapper>
            );

            // Both should show their respective prompts
            await waitFor(() => {
                expect(screen.getByText(/first concurrent/i)).toBeInTheDocument();
                expect(screen.getByText(/second concurrent/i)).toBeInTheDocument();
            });

            // Both should show generating status
            const generatingElements = screen.getAllByText(/generating/i);
            expect(generatingElements).toHaveLength(2);
        });
    });
});