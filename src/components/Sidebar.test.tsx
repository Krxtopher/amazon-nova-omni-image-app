import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// Mock the useUIStore hook
const mockSetLayoutMode = vi.fn();
vi.mock('@/stores/uiStore', () => ({
    useUIStore: () => ({
        layoutMode: 'vertical',
        setLayoutMode: mockSetLayoutMode
    })
}));

// Mock console.log to test button clicks
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

// Helper function to render Sidebar with Router
const renderSidebar = (props = {}) => {
    return render(
        <BrowserRouter>
            <Sidebar {...props} />
        </BrowserRouter>
    );
};

describe('Sidebar', () => {
    beforeEach(() => {
        mockSetLayoutMode.mockClear();
    });

    afterEach(() => {
        consoleSpy.mockClear();
    });

    it('renders the Amazon Nova logo', () => {
        renderSidebar();

        const logo = screen.getByAltText('Amazon Nova');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src', '/AmazonNova_Symbol_Gradient_RGB.svg');
    });

    it('renders all navigation buttons', () => {
        renderSidebar();

        // Check that all buttons are present by their aria-labels
        expect(screen.getByLabelText('Home')).toBeInTheDocument();
        expect(screen.getByLabelText('Gallery')).toBeInTheDocument();
        expect(screen.getByLabelText('Switch to Horizontal Layout')).toBeInTheDocument();
        expect(screen.getByLabelText('Colors')).toBeInTheDocument();
        expect(screen.getByLabelText('Download')).toBeInTheDocument();
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
        expect(screen.getByLabelText('Help')).toBeInTheDocument();
        expect(screen.getByLabelText('Demo Effects')).toBeInTheDocument();
    });

    it('handles button clicks correctly', () => {
        // Mock window.scrollTo
        const scrollToSpy = vi.fn();
        Object.defineProperty(window, 'scrollTo', { value: scrollToSpy });

        renderSidebar();

        const homeButton = screen.getByLabelText('Home');
        fireEvent.click(homeButton);

        expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('handles gallery button click correctly', () => {
        // Mock querySelector
        const mockElement = { scrollIntoView: vi.fn() };
        const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);

        renderSidebar();

        const galleryButton = screen.getByLabelText('Gallery');
        fireEvent.click(galleryButton);

        expect(querySelectorSpy).toHaveBeenCalledWith('[aria-label="Generated images gallery"]');
        expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('handles future feature buttons correctly', () => {
        renderSidebar();

        const colorsButton = screen.getByLabelText('Colors');
        fireEvent.click(colorsButton);

        // Colors button doesn't log anymore, it's a placeholder
        // Just verify it doesn't crash
        expect(colorsButton).toBeInTheDocument();
    });

    it('handles layout toggle correctly', () => {
        renderSidebar();

        const layoutButton = screen.getByLabelText('Switch to Horizontal Layout');
        fireEvent.click(layoutButton);

        expect(mockSetLayoutMode).toHaveBeenCalledWith('horizontal');
    });

    it('applies active state to clicked buttons', () => {
        renderSidebar();

        const homeButton = screen.getByLabelText('Home');
        fireEvent.click(homeButton);

        // The button should have the active styling
        expect(homeButton).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('applies custom className when provided', () => {
        const { container } = renderSidebar({ className: 'custom-class' });

        const sidebar = container.querySelector('aside');
        expect(sidebar).toHaveClass('custom-class');
    });
});