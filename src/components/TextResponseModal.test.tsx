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
                content="This is a test text response"
            />
        );

        expect(screen.getByText('Model Response')).toBeInTheDocument();
        expect(screen.getByText('The AI model generated a text response instead of an image.')).toBeInTheDocument();
        expect(screen.getByText('This is a test text response')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <TextResponseModal
                isOpen={false}
                onClose={vi.fn()}
                content="This is a test text response"
            />
        );

        expect(screen.queryByText('Model Response')).not.toBeInTheDocument();
    });

    it('calls onClose when dialog is closed', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <TextResponseModal
                isOpen={true}
                onClose={onClose}
                content="This is a test text response"
            />
        );

        // Find and click the close button (X button in dialog)
        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    it('displays multi-line content correctly', () => {
        const multiLineContent = 'Line 1\nLine 2\nLine 3';

        render(
            <TextResponseModal
                isOpen={true}
                onClose={vi.fn()}
                content={multiLineContent}
            />
        );

        // Check that the content is present (using a function matcher to handle whitespace)
        expect(screen.getByText((_content, element) => {
            return element?.textContent === multiLineContent;
        })).toBeInTheDocument();
    });
});
