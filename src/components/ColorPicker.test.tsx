import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColorPicker } from './ColorPicker';

// Mock html2canvas
vi.mock('html2canvas', () => ({
    default: vi.fn(() => Promise.resolve({
        getContext: vi.fn(() => ({
            getImageData: vi.fn(() => ({
                data: [255, 0, 0, 255] // Red pixel
            }))
        })),
        width: 100,
        height: 100,
        getBoundingClientRect: vi.fn(() => ({
            width: 100,
            height: 100
        }))
    }))
}));

// Mock clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(() => Promise.resolve())
    }
});

describe('ColorPicker', () => {
    it('renders the eye dropper button', () => {
        render(<ColorPicker />);

        const button = screen.getByTitle('Pick a color');
        expect(button).toBeInTheDocument();
    });

    it('shows cancel button when active', async () => {
        render(<ColorPicker />);

        const button = screen.getByTitle('Pick a color');
        fireEvent.click(button);

        // Wait for the button to change
        await screen.findByTitle('Cancel color picker (ESC)');
        expect(screen.getByTitle('Cancel color picker (ESC)')).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
        render(<ColorPicker className="test-class" />);

        const container = screen.getByTitle('Pick a color').closest('div');
        expect(container).toHaveClass('test-class');
    });

    it('handles escape key to cancel', async () => {
        render(<ColorPicker />);

        const button = screen.getByTitle('Pick a color');
        fireEvent.click(button);

        // Wait for active state
        await screen.findByTitle('Cancel color picker (ESC)');

        // Press escape
        fireEvent.keyDown(document, { key: 'Escape' });

        // Should return to initial state
        expect(screen.getByTitle('Pick a color')).toBeInTheDocument();
    });
});