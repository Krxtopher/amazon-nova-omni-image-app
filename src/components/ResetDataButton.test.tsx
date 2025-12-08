import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetDataButton } from './ResetDataButton';
import { sqliteService } from '@/services/sqliteService';
import { useImageStore } from '@/stores/imageStore';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/services/sqliteService', () => ({
    sqliteService: {
        clearAll: vi.fn(),
        init: vi.fn().mockResolvedValue(undefined),
        getAllImages: vi.fn().mockResolvedValue([]),
        getSetting: vi.fn().mockResolvedValue(null),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('ResetDataButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the reset button', () => {
        render(<ResetDataButton />);
        const button = screen.getByLabelText('Reset all data');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent('Reset Data');
    });

    it('should show confirmation dialog when clicked', () => {
        render(<ResetDataButton />);
        const button = screen.getByLabelText('Reset all data');

        fireEvent.click(button);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Reset All Data?')).toBeInTheDocument();
        expect(screen.getByText(/permanently delete all your generated images/i)).toBeInTheDocument();
    });

    it('should close dialog when cancel is clicked', () => {
        render(<ResetDataButton />);
        const button = screen.getByLabelText('Reset all data');

        fireEvent.click(button);
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close dialog when clicking outside', () => {
        render(<ResetDataButton />);
        const button = screen.getByLabelText('Reset all data');

        fireEvent.click(button);
        const dialog = screen.getByRole('dialog');
        const backdrop = dialog.parentElement;

        if (backdrop) {
            fireEvent.click(backdrop);
        }

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it.skip('should call clearAll and show success toast when confirmed', async () => {
        const mockClearAll = vi.mocked(sqliteService.clearAll);
        const mockInitialize = vi.fn();

        // Mock the store
        vi.spyOn(useImageStore, 'getState').mockReturnValue({
            initialize: mockInitialize,
        } as any);

        render(<ResetDataButton />);

        // Open dialog
        const openButton = screen.getByLabelText('Reset all data');
        fireEvent.click(openButton);

        // Confirm reset - use getByText to find the exact button
        const confirmButton = screen.getByText('Reset All Data', { selector: 'button' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(mockClearAll).toHaveBeenCalled();
            expect(mockInitialize).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith(
                'All data has been reset',
                expect.any(Object)
            );
        });

        // Dialog should be closed
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show error toast if reset fails', async () => {
        const mockClearAll = vi.mocked(sqliteService.clearAll);
        mockClearAll.mockRejectedValueOnce(new Error('Reset failed'));

        const mockInitialize = vi.fn();
        vi.spyOn(useImageStore, 'getState').mockReturnValue({
            initialize: mockInitialize,
        } as any);

        render(<ResetDataButton />);

        // Open dialog
        const openButton = screen.getByLabelText('Reset all data');
        fireEvent.click(openButton);

        // Confirm reset
        const confirmButton = screen.getByText('Reset All Data', { selector: 'button' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                'Failed to reset data. Please try again.',
                expect.any(Object)
            );
        });
    });

    it('should disable buttons while resetting', async () => {
        const mockClearAll = vi.mocked(sqliteService.clearAll);
        mockClearAll.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        const mockInitialize = vi.fn();
        vi.spyOn(useImageStore, 'getState').mockReturnValue({
            initialize: mockInitialize,
        } as any);

        render(<ResetDataButton />);

        // Open dialog
        const openButton = screen.getByLabelText('Reset all data');
        fireEvent.click(openButton);

        // Confirm reset
        const confirmButton = screen.getByText('Reset All Data', { selector: 'button' });
        fireEvent.click(confirmButton);

        // Buttons should be disabled during reset
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeDisabled();
        expect(screen.getByText('Resetting...')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockClearAll).toHaveBeenCalled();
        });
    });
});
