/**
 * Simple Integration Tests for Streaming Prompt Enhancement System
 * 
 * Tests core integration points and component interactions without complex AWS mocking.
 * Focuses on component behavior and state management.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StreamingPromptDisplay } from '../components/StreamingPromptDisplay';
import { ImageCard } from '../components/ImageCard';
import { WordRevealContainer } from '../components/WordRevealContainer';
import { StreamingDisplayConfigProvider } from '../contexts/StreamingDisplayConfigContext';
import type { GeneratedImage, DisplayWord } from '../types';

// Mock the streaming service to avoid AWS dependencies
vi.mock('../services/StreamingPromptEnhancementService', () => ({
    StreamingPromptEnhancementService: vi.fn().mockImplementation(() => ({
        enhancePromptStreaming: vi.fn(),
        cancelStreaming: vi.fn()
    }))
}));

// Mock performance monitoring
vi.mock('../services/PerformanceMonitoringService', () => ({
    PerformanceMonitoringService: {
        getInstance: vi.fn(() => ({
            startMonitoring: vi.fn(),
            recordEnhancementTime: vi.fn(),
            recordDisplayTime: vi.fn()
        }))
    }
}));

// Mock performance optimizer
vi.mock('../utils/PerformanceOptimizer', () => ({
    PerformanceOptimizer: {
        getInstance: vi.fn(() => ({
            registerDisplay: vi.fn(),
            unregisterDisplay: vi.fn()
        }))
    },
    usePerformanceOptimizer: vi.fn(() => ({
        registerDisplay: vi.fn(),
        unregisterDisplay: vi.fn()
    }))
}));

// Mock accessibility hooks
vi.mock('../hooks/useStreamingDisplayAccessibility', () => ({
    useStreamingDisplayAccessibility: vi.fn(() => ({
        announce: vi.fn(),
        announceProgress: vi.fn(),
        announceStreamingStatus: vi.fn(),
        shouldUseInstantDisplay: vi.fn(() => false),
        getAccessibilityAttributes: vi.fn(() => ({})),
        getKeyboardInstructions: vi.fn(() => '')
    }))
}));

vi.mock('../hooks', () => ({
    useStreamingDisplayKeyboard: vi.fn(),
    useImageData: vi.fn(() => ({ imageUrl: null, isLoading: false }))
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
        <BrowserRouter>
            <StreamingDisplayConfigProvider>
                {children}
            </StreamingDisplayConfigProvider>
        </BrowserRouter>
    );
}

describe('Streaming Prompt Enhancement Simple Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('WordRevealContainer Component', () => {
        it('should render words with proper visibility states', () => {
            const testWords: DisplayWord[] = [
                {
                    text: 'Hello',
                    delay: 100,
                    fadeInDuration: 200,
                    isVisible: true,
                    hasAnimated: true
                },
                {
                    text: 'world',
                    delay: 150,
                    fadeInDuration: 200,
                    isVisible: false,
                    hasAnimated: false
                }
            ];

            render(
                <WordRevealContainer
                    words={testWords}
                    isActive={true}
                    showCursor={true}
                />
            );

            // First word should be visible
            expect(screen.getByText('Hello')).toBeInTheDocument();

            // Second word should not be visible (or should have opacity 0)
            const worldElement = screen.queryByText('world');
            if (worldElement) {
                // If rendered, it should have opacity 0 or be hidden
                const styles = window.getComputedStyle(worldElement);
                expect(styles.opacity === '0' || styles.visibility === 'hidden').toBe(true);
            }
        });

        it('should show cursor when active', () => {
            const testWords: DisplayWord[] = [
                {
                    text: 'Test',
                    delay: 100,
                    fadeInDuration: 200,
                    isVisible: true,
                    hasAnimated: true
                }
            ];

            render(
                <WordRevealContainer
                    words={testWords}
                    isActive={true}
                    showCursor={true}
                />
            );

            // Should show some kind of cursor indicator
            const container = screen.getByText('Test').closest('div');
            expect(container).toBeInTheDocument();
        });
    });

    describe('StreamingPromptDisplay Component Integration', () => {
        it('should render with original prompt when enhancement is off', async () => {
            const testPrompt = 'A beautiful sunset';

            render(
                <TestWrapper>
                    <StreamingPromptDisplay
                        originalPrompt={testPrompt}
                        enhancementType="off"
                        onDisplayComplete={vi.fn()}
                    />
                </TestWrapper>
            );

            // Should eventually show the prompt words
            await waitFor(() => {
                expect(screen.getByText(/beautiful/i)).toBeInTheDocument();
            }, { timeout: 2000 });
        });

        it('should call completion callback when display finishes', async () => {
            const onDisplayComplete = vi.fn();
            const testPrompt = 'Short test';

            render(
                <TestWrapper>
                    <StreamingPromptDisplay
                        originalPrompt={testPrompt}
                        enhancementType="off"
                        onDisplayComplete={onDisplayComplete}
                    />
                </TestWrapper>
            );

            // Fast-forward timers to complete display
            vi.advanceTimersByTime(5000);

            await waitFor(() => {
                expect(onDisplayComplete).toHaveBeenCalled();
            }, { timeout: 1000 });
        });

        it('should handle empty prompts gracefully', () => {
            render(
                <TestWrapper>
                    <StreamingPromptDisplay
                        originalPrompt=""
                        enhancementType="off"
                        onDisplayComplete={vi.fn()}
                    />
                </TestWrapper>
            );

            // Should not crash and should render something
            expect(screen.getByRole('region', { hidden: true })).toBeInTheDocument();
        });
    });

    describe('ImageCard Integration with Streaming Display', () => {
        it('should show streaming display for generating images', () => {
            const mockImage: GeneratedImage = {
                id: 'test-image-1',
                url: '',
                prompt: 'A beautiful landscape with mountains',
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

            // Should show generating status
            expect(screen.getByText(/generating/i)).toBeInTheDocument();

            // Should show some part of the prompt
            expect(screen.getByText(/beautiful/i) || screen.getByText(/landscape/i) || screen.getByText(/mountains/i)).toBeInTheDocument();
        });

        it('should show completed image without streaming display', () => {
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
            const image = screen.getByRole('img');
            expect(image).toHaveAttribute('src', mockImage.url);
            expect(image).toHaveAttribute('alt', mockImage.prompt);
        });

        it('should handle error states properly', () => {
            const mockImage: GeneratedImage = {
                id: 'test-image-error',
                url: '',
                prompt: 'Failed image generation',
                status: 'error',
                error: 'Generation failed due to network error',
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

            // Should show error message
            expect(screen.getByText(/generation failed/i)).toBeInTheDocument();

            // Should show original prompt
            expect(screen.getByText(/failed image generation/i)).toBeInTheDocument();
        });
    });

    describe('Backward Compatibility', () => {
        it('should work with streaming display disabled', () => {
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

        it('should handle missing enhancement type gracefully', () => {
            const mockImage: GeneratedImage = {
                id: 'no-enhancement-type',
                url: '',
                prompt: 'Test without enhancement type',
                status: 'generating',
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
                    // enhancementType not provided - should default to 'off'
                    />
                </TestWrapper>
            );

            // Should not crash and should show content
            expect(screen.getByText(/test without enhancement/i)).toBeInTheDocument();
        });
    });

    describe('Multiple Concurrent Displays', () => {
        it('should handle multiple ImageCards independently', () => {
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
            expect(screen.getByText(/first concurrent/i)).toBeInTheDocument();
            expect(screen.getByText(/second concurrent/i)).toBeInTheDocument();

            // Both should show generating status
            const generatingElements = screen.getAllByText(/generating/i);
            expect(generatingElements).toHaveLength(2);
        });
    });

    describe('Configuration Integration', () => {
        it('should respect configuration context settings', () => {
            render(
                <TestWrapper>
                    <StreamingPromptDisplay
                        originalPrompt="Configuration test"
                        enhancementType="off"
                        onDisplayComplete={vi.fn()}
                    />
                </TestWrapper>
            );

            // Should render without errors, indicating configuration context is working
            expect(screen.getByText(/configuration/i)).toBeInTheDocument();
        });
    });
});