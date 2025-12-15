import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextResponseModal } from './TextResponseModal';

describe('TextResponseModal', () => {
    it('renders when open', () => {
        render(
            <TextResponseModal
                isOpen={true}
                onClose={vi.fn()}
                originalPrompt="Create a beautiful sunset"
            />
        );

        expect(screen.getByText('Unable to Generate Image')).toBeInTheDocument();
        expect(screen.getByText(/I'm sorry. I'm having trouble interpreting/)).toBeInTheDocument();
        expect(screen.getByText('Create a beautiful sunset')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <TextResponseModal
                isOpen={false}
                onClose={vi.fn()}
                originalPrompt="Create a beautiful sunset"
            />
        );

        expect(screen.queryByText('Unable to Generate Image')).not.toBeInTheDocument();
    });

    it('calls onClose when dialog is closed', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <TextResponseModal
                isOpen={true}
                onClose={onClose}
                originalPrompt="Create a beautiful sunset"
            />
        );

        // Find and click the close button (X button in dialog)
        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    it('displays multi-line content correctly', () => {
        const multiLinePrompt = 'Line 1\nLine 2\nLine 3';

        render(
            <TextResponseModal
                isOpen={true}
                onClose={vi.fn()}
                originalPrompt={multiLinePrompt}
            />
        );

        // Check that each line is displayed
        expect(screen.getByText(/Line 1/)).toBeInTheDocument();
        expect(screen.getByText(/Line 2/)).toBeInTheDocument();
        expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    });

    it('truncates long prompts correctly', () => {
        const longPrompt = 'This is a very long prompt that should be truncated because it exceeds the maximum length limit that we have set for displaying prompts in the modal dialog';

        render(
            <TextResponseModal
                isOpen={true}
                onClose={vi.fn()}
                originalPrompt={longPrompt}
            />
        );

        // Check that the prompt is truncated with ellipsis
        const displayedText = screen.getByText(/This is a very long prompt/);
        expect(displayedText.textContent).toContain('...');
        expect(displayedText.textContent!.length).toBeLessThan(longPrompt.length);
    });

    it('handles empty prompt gracefully', () => {
        render(
            <TextResponseModal
                isOpen={true}
                onClose={vi.fn()}
                originalPrompt=""
            />
        );

        expect(screen.getByText('Unable to Generate Image')).toBeInTheDocument();
        expect(screen.getByText(/I'm sorry. I'm having trouble interpreting/)).toBeInTheDocument();
    });
});
