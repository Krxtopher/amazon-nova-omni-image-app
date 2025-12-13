import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextCard } from './TextCard';

describe('TextCard', () => {
    const mockProps = {
        id: 'test-id',
        content: 'This is a test text response',
        prompt: 'Test prompt',
        createdAt: new Date('2023-01-01T12:00:00Z'),
        onDelete: vi.fn(),
    };

    it('renders text content', () => {
        render(<TextCard {...mockProps} />);

        expect(screen.getByText('This is a test text response')).toBeInTheDocument();
        expect(screen.getByText('Test prompt')).toBeInTheDocument();
    });

    it('displays formatted date and time', () => {
        render(<TextCard {...mockProps} />);

        // Check that date is displayed (format may vary by locale)
        expect(screen.getByText(/1\/1\/2023/)).toBeInTheDocument();
    });

    it('calls onDelete when delete button is clicked', async () => {
        const user = userEvent.setup();
        const mockOnDelete = vi.fn();

        render(<TextCard {...mockProps} onDelete={mockOnDelete} />);

        // Find and click delete button
        const deleteButton = screen.getByTitle('Delete');
        await user.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalledWith('test-id');
    });

    it('copies text to clipboard when copy button is clicked', async () => {
        const user = userEvent.setup();

        // Mock clipboard API
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: mockWriteText,
            },
            writable: true,
        });

        render(<TextCard {...mockProps} />);

        // Find and click copy button
        const copyButton = screen.getByTitle('Copy text');
        await user.click(copyButton);

        expect(mockWriteText).toHaveBeenCalledWith('This is a test text response');
    });
});