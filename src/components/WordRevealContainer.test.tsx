import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WordRevealContainer } from './WordRevealContainer';
import type { DisplayWord } from '../types/streaming';

describe('WordRevealContainer', () => {
    const createMockWords = (texts: string[], visibleCount: number = 0): DisplayWord[] => {
        return texts.map((text, index) => ({
            text,
            delay: 100,
            fadeInDuration: 200,
            isVisible: index < visibleCount,
            hasAnimated: false
        }));
    };

    it('renders words correctly', () => {
        const words = createMockWords(['Hello', 'world'], 2);
        render(<WordRevealContainer words={words} isActive={false} />);

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('world')).toBeInTheDocument();
    });

    it('shows typing cursor when active', () => {
        const words = createMockWords(['Hello'], 1);
        render(<WordRevealContainer words={words} isActive={true} showCursor={true} />);

        expect(screen.getByText('|')).toBeInTheDocument();
    });

    it('hides typing cursor when not active', () => {
        const words = createMockWords(['Hello'], 1);
        render(<WordRevealContainer words={words} isActive={false} showCursor={true} />);

        expect(screen.queryByText('|')).not.toBeInTheDocument();
    });

    it('applies correct visibility classes', () => {
        const words = createMockWords(['Hello', 'world'], 1);
        render(<WordRevealContainer words={words} isActive={true} />);

        const helloSpan = screen.getByText('Hello');
        const worldSpan = screen.getByText('world');

        expect(helloSpan).toHaveClass('opacity-100');
        expect(worldSpan).toHaveClass('opacity-0');
    });

    it('includes accessibility attributes', () => {
        const words = createMockWords(['Hello'], 1);
        render(<WordRevealContainer words={words} isActive={true} />);

        const container = screen.getByRole('status');
        expect(container).toHaveAttribute('aria-live', 'polite');
        expect(container).toHaveAttribute('aria-label', 'Text is being revealed word by word');
    });

    it('updates aria-label when not active', () => {
        const words = createMockWords(['Hello'], 1);
        render(<WordRevealContainer words={words} isActive={false} />);

        const container = screen.getByRole('status');
        expect(container).toHaveAttribute('aria-label', 'Text revelation complete');
    });
});