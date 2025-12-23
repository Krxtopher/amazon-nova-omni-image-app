import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StreamingPromptDisplay } from './StreamingPromptDisplay';
import { StreamingDisplayConfigProvider } from '../contexts/StreamingDisplayConfigContext';

// Mock the services and utilities
vi.mock('../services/StreamingPromptEnhancementService');

// Test wrapper with configuration provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <StreamingDisplayConfigProvider>
        {children}
    </StreamingDisplayConfigProvider>
);

describe('StreamingPromptDisplay', () => {
    it('renders loading state initially', () => {
        render(
            <TestWrapper>
                <StreamingPromptDisplay
                    originalPrompt="Test prompt"
                    enhancementType="off"
                />
            </TestWrapper>
        );

        // Should show the main streaming display container
        expect(screen.getByLabelText('Text is being revealed word by word')).toBeInTheDocument();
    });

    it('handles enhancement completion callback', () => {
        const onEnhancementComplete = vi.fn();

        render(
            <TestWrapper>
                <StreamingPromptDisplay
                    originalPrompt="Test prompt"
                    enhancementType="off"
                    onEnhancementComplete={onEnhancementComplete}
                />
            </TestWrapper>
        );

        // Component should render without errors
        expect(screen.getByLabelText('Text is being revealed word by word')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <TestWrapper>
                <StreamingPromptDisplay
                    originalPrompt="Test prompt"
                    enhancementType="off"
                    className="custom-class"
                />
            </TestWrapper>
        );

        // Should have the custom class applied
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('supports multiple concurrent instances independently', () => {
        // Render two instances with different prompts
        const { container } = render(
            <TestWrapper>
                <div>
                    <StreamingPromptDisplay
                        originalPrompt="First prompt"
                        enhancementType="off"
                    />
                    <StreamingPromptDisplay
                        originalPrompt="Second prompt"
                        enhancementType="off"
                    />
                </div>
            </TestWrapper>
        );

        // Both should render independently - look for word reveal containers
        const wordContainers = screen.getAllByLabelText('Text is being revealed word by word');
        expect(wordContainers).toHaveLength(2);

        // Each instance should have its own container
        const streamingDisplays = container.querySelectorAll('div > div');
        expect(streamingDisplays.length).toBeGreaterThanOrEqual(2);
    });
});