import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './Sidebar';

// Mock console.log to test button clicks
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

describe('Sidebar', () => {
    afterEach(() => {
        consoleSpy.mockClear();
    });

    it('renders the Amazon Nova logo', () => {
        render(<Sidebar />);

        const logo = screen.getByAltText('Amazon Nova');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src', '/AmazonNova_Symbol_Gradient_RGB.svg');
    });

    it('renders all navigation buttons', () => {
        render(<Sidebar />);

        // Check that all buttons are present by their aria-labels
        expect(screen.getByLabelText('Home')).toBeInTheDocument();
        expect(screen.getByLabelText('Gallery')).toBeInTheDocument();
        expect(screen.getByLabelText('Colors')).toBeInTheDocument();
        expect(screen.getByLabelText('Download')).toBeInTheDocument();
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
        expect(screen.getByLabelText('Help')).toBeInTheDocument();
    });

    it('handles button clicks correctly', () => {
        // Mock window.scrollTo
        const scrollToSpy = vi.fn();
        Object.defineProperty(window, 'scrollTo', { value: scrollToSpy });

        render(<Sidebar />);

        const homeButton = screen.getByLabelText('Home');
        fireEvent.click(homeButton);

        expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('handles gallery button click correctly', () => {
        // Mock querySelector
        const mockElement = { scrollIntoView: vi.fn() };
        const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);

        render(<Sidebar />);

        const galleryButton = screen.getByLabelText('Gallery');
        fireEvent.click(galleryButton);

        expect(querySelectorSpy).toHaveBeenCalledWith('[aria-label="Generated images gallery"]');
        expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('handles future feature buttons correctly', () => {
        render(<Sidebar />);

        const colorsButton = screen.getByLabelText('Colors');
        fireEvent.click(colorsButton);

        expect(consoleSpy).toHaveBeenCalledWith('Colors clicked - feature coming soon');
    });

    it('applies active state to clicked buttons', () => {
        render(<Sidebar />);

        const homeButton = screen.getByLabelText('Home');
        fireEvent.click(homeButton);

        // The button should have the active styling
        expect(homeButton).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('applies custom className when provided', () => {
        const { container } = render(<Sidebar className="custom-class" />);

        const sidebar = container.querySelector('aside');
        expect(sidebar).toHaveClass('custom-class');
    });
});