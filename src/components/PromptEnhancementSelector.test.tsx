import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptEnhancementSelector } from './PromptEnhancementSelector';

describe('PromptEnhancementSelector', () => {
    const mockOnEnhancementChange = vi.fn();
    const mockOnExpandedChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with default enhancement (off)', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="off"
                onEnhancementChange={mockOnEnhancementChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Off');
    });

    it('renders with standard enhancement', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="standard"
                onEnhancementChange={mockOnEnhancementChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Standard');
    });

    it('renders with creative enhancement', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="creative"
                onEnhancementChange={mockOnEnhancementChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Creative');
    });

    it('renders with custom enhancement', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="custom"
                onEnhancementChange={mockOnEnhancementChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Custom');
    });

    it('calls onExpandedChange when clicked', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="off"
                onEnhancementChange={mockOnEnhancementChange}
                onExpandedChange={mockOnExpandedChange}
                isExpanded={false}
            />
        );

        fireEvent.click(screen.getByRole('button'));
        expect(mockOnExpandedChange).toHaveBeenCalledWith(true);
    });

    it('does not call onExpandedChange when disabled', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="off"
                onEnhancementChange={mockOnEnhancementChange}
                onExpandedChange={mockOnExpandedChange}
                disabled={true}
            />
        );

        fireEvent.click(screen.getByRole('button'));
        expect(mockOnExpandedChange).not.toHaveBeenCalled();
    });

    it('shows expanded state styling when isExpanded is true', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="off"
                onEnhancementChange={mockOnEnhancementChange}
                onExpandedChange={mockOnExpandedChange}
                isExpanded={true}
            />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-accent/50');
    });
});