import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptEnhancementSelector } from './PromptEnhancementSelector';

describe('PromptEnhancementSelector', () => {
    const mockOnPersonaChange = vi.fn();
    const mockOnExpandedChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with default persona (off)', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="off"
                onEnhancementChange={mockOnPersonaChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Off');
    });

    it('renders with standard persona', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="standard"
                onEnhancementChange={mockOnPersonaChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Standard');
    });

    it('renders with creative persona', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="creative"
                onEnhancementChange={mockOnPersonaChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Creative');
    });

    it('renders with custom persona', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="custom"
                onEnhancementChange={mockOnPersonaChange}
                onExpandedChange={mockOnExpandedChange}
            />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Custom');
    });

    it('calls onExpandedChange when clicked', () => {
        render(
            <PromptEnhancementSelector
                selectedEnhancement="off"
                onEnhancementChange={mockOnPersonaChange}
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
                onEnhancementChange={mockOnPersonaChange}
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
                onEnhancementChange={mockOnPersonaChange}
                onExpandedChange={mockOnExpandedChange}
                isExpanded={true}
            />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-accent/50');
    });
});