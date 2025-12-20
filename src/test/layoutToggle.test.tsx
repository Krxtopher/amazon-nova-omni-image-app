import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';

// Mock the useImageStore hook
const mockSetLayoutMode = vi.fn();
let mockLayoutMode = 'vertical';

vi.mock('@/stores/imageStore', () => ({
    useImageStore: () => ({
        layoutMode: mockLayoutMode,
        setLayoutMode: mockSetLayoutMode
    })
}));

// Helper function to render Sidebar with Router
const renderSidebar = () => {
    return render(
        <BrowserRouter>
            <Sidebar />
        </BrowserRouter>
    );
};

describe('Layout Toggle Feature', () => {
    beforeEach(() => {
        mockSetLayoutMode.mockClear();
        mockLayoutMode = 'vertical';
    });

    it('should show vertical layout icon when in vertical mode', () => {
        renderSidebar();

        const layoutButton = screen.getByLabelText('Switch to Horizontal Layout');
        expect(layoutButton).toBeInTheDocument();
    });

    it('should show horizontal layout icon when in horizontal mode', () => {
        mockLayoutMode = 'horizontal';

        renderSidebar();

        const layoutButton = screen.getByLabelText('Switch to Vertical Layout');
        expect(layoutButton).toBeInTheDocument();
    });

    it('should toggle from vertical to horizontal when clicked', () => {
        renderSidebar();

        const layoutButton = screen.getByLabelText('Switch to Horizontal Layout');
        fireEvent.click(layoutButton);

        expect(mockSetLayoutMode).toHaveBeenCalledWith('horizontal');
    });

    it('should toggle from horizontal to vertical when clicked', () => {
        mockLayoutMode = 'horizontal';

        renderSidebar();

        const layoutButton = screen.getByLabelText('Switch to Vertical Layout');
        fireEvent.click(layoutButton);

        expect(mockSetLayoutMode).toHaveBeenCalledWith('vertical');
    });
});