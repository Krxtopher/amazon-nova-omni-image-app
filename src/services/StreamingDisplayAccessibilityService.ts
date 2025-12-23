/**
 * StreamingDisplayAccessibilityService - Accessibility support for streaming display
 * 
 * This service provides comprehensive accessibility features for the streaming prompt
 * enhancement and word-by-word display system, including screen reader support,
 * keyboard navigation, and motion-reduced modes.
 */

import type { StreamingDisplayAccessibilitySettings } from '../types/config';

/**
 * Accessibility announcement types
 */
export type AnnouncementType = 'status' | 'progress' | 'completion' | 'error';

/**
 * Accessibility service for streaming display
 */
export class StreamingDisplayAccessibilityService {
    private politeRegion: HTMLElement | null = null;
    private assertiveRegion: HTMLElement | null = null;
    private settings: StreamingDisplayAccessibilitySettings;
    private keyboardListeners: Map<string, (event: KeyboardEvent) => void> = new Map();

    constructor(settings: StreamingDisplayAccessibilitySettings) {
        this.settings = settings;
        this.initializeLiveRegions();
        this.setupKeyboardNavigation();
    }

    /**
     * Update accessibility settings
     */
    updateSettings(settings: Partial<StreamingDisplayAccessibilitySettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * Announce text to screen readers
     */
    announce(message: string, _type: AnnouncementType = 'status', priority: 'polite' | 'assertive' = 'polite'): void {
        if (!this.settings.enableScreenReaderAnnouncements) {
            return;
        }

        const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;

        if (region) {
            // Clear previous announcement
            region.textContent = '';

            // Add new announcement after a brief delay to ensure screen readers pick it up
            setTimeout(() => {
                if (region) {
                    region.textContent = message;
                }
            }, 100);
        }
    }

    /**
     * Announce display progress
     */
    announceProgress(currentWord: number, totalWords: number, isComplete: boolean = false): void {
        if (!this.settings.announceProgress) {
            return;
        }

        let message: string;

        if (isComplete) {
            message = `Text revelation complete. ${totalWords} words displayed.`;
        } else {
            const percentage = Math.round((currentWord / totalWords) * 100);
            message = `Revealing text: ${percentage}% complete, word ${currentWord} of ${totalWords}`;
        }

        this.announce(message, 'progress', 'polite');
    }

    /**
     * Announce streaming status
     */
    announceStreamingStatus(status: 'starting' | 'enhancing' | 'displaying' | 'complete' | 'error', details?: string): void {
        if (!this.settings.enableScreenReaderAnnouncements) {
            return;
        }

        let message: string;

        switch (status) {
            case 'starting':
                message = 'Starting prompt enhancement and display';
                break;
            case 'enhancing':
                message = 'Enhancing prompt with AI assistance';
                break;
            case 'displaying':
                message = 'Beginning word-by-word text display';
                break;
            case 'complete':
                message = 'Prompt display complete';
                break;
            case 'error':
                message = `Error occurred: ${details || 'Unknown error'}. Falling back to original prompt.`;
                break;
        }

        this.announce(message, status === 'error' ? 'error' : 'status', status === 'error' ? 'assertive' : 'polite');
    }

    /**
     * Set up keyboard navigation for streaming display
     */
    setupKeyboardNavigation(): void {
        // Skip to end of display (Escape key)
        this.addKeyboardListener('Escape', (event) => {
            const activeDisplay = document.querySelector('[data-streaming-display-active="true"]');
            if (activeDisplay) {
                event.preventDefault();
                this.skipToEnd();
                this.announce('Skipped to end of text display', 'status', 'polite');
            }
        });

        // Pause/resume display (Space key)
        this.addKeyboardListener(' ', (event) => {
            const activeDisplay = document.querySelector('[data-streaming-display-active="true"]');
            if (activeDisplay && event.target === activeDisplay) {
                event.preventDefault();
                this.togglePause();
            }
        });

        // Speed up display (+ key)
        this.addKeyboardListener('+', (event) => {
            const activeDisplay = document.querySelector('[data-streaming-display-active="true"]');
            if (activeDisplay) {
                event.preventDefault();
                this.adjustSpeed(1.5);
                this.announce('Display speed increased', 'status', 'polite');
            }
        });

        // Slow down display (- key)
        this.addKeyboardListener('-', (event) => {
            const activeDisplay = document.querySelector('[data-streaming-display-active="true"]');
            if (activeDisplay) {
                event.preventDefault();
                this.adjustSpeed(0.75);
                this.announce('Display speed decreased', 'status', 'polite');
            }
        });
    }

    /**
     * Add keyboard event listener
     */
    private addKeyboardListener(key: string, handler: (event: KeyboardEvent) => void): void {
        const wrappedHandler = (event: KeyboardEvent) => {
            if (event.key === key) {
                handler(event);
            }
        };

        this.keyboardListeners.set(key, wrappedHandler);
        document.addEventListener('keydown', wrappedHandler);
    }

    /**
     * Remove keyboard event listener
     */
    private removeKeyboardListener(key: string): void {
        const handler = this.keyboardListeners.get(key);
        if (handler) {
            document.removeEventListener('keydown', handler);
            this.keyboardListeners.delete(key);
        }
    }

    /**
     * Skip to end of current display
     */
    private skipToEnd(): void {
        // Dispatch custom event that components can listen to
        const event = new CustomEvent('streaming-display-skip', {
            bubbles: true,
            detail: { action: 'skip-to-end' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Toggle pause/resume of current display
     */
    private togglePause(): void {
        const event = new CustomEvent('streaming-display-toggle', {
            bubbles: true,
            detail: { action: 'toggle-pause' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Adjust display speed
     */
    private adjustSpeed(multiplier: number): void {
        const event = new CustomEvent('streaming-display-speed', {
            bubbles: true,
            detail: { action: 'adjust-speed', multiplier }
        });
        document.dispatchEvent(event);
    }

    /**
     * Initialize ARIA live regions for screen reader announcements
     */
    private initializeLiveRegions(): void {
        if (typeof document === 'undefined') {
            return;
        }

        // Create polite live region
        this.politeRegion = document.createElement('div');
        this.politeRegion.setAttribute('aria-live', 'polite');
        this.politeRegion.setAttribute('aria-atomic', 'true');
        this.politeRegion.className = 'sr-only';
        this.politeRegion.id = 'streaming-display-polite-announcements';
        document.body.appendChild(this.politeRegion);

        // Create assertive live region for urgent announcements
        this.assertiveRegion = document.createElement('div');
        this.assertiveRegion.setAttribute('aria-live', 'assertive');
        this.assertiveRegion.setAttribute('aria-atomic', 'true');
        this.assertiveRegion.className = 'sr-only';
        this.assertiveRegion.id = 'streaming-display-assertive-announcements';
        document.body.appendChild(this.assertiveRegion);

        // Set primary live region reference
        // Live region setup is handled by politeRegion
    }

    /**
     * Clean up accessibility service
     */
    cleanup(): void {
        // Remove live regions
        if (this.politeRegion && this.politeRegion.parentNode) {
            this.politeRegion.parentNode.removeChild(this.politeRegion);
        }

        if (this.assertiveRegion && this.assertiveRegion.parentNode) {
            this.assertiveRegion.parentNode.removeChild(this.assertiveRegion);
        }

        // Remove keyboard listeners
        this.keyboardListeners.forEach((_, key) => {
            this.removeKeyboardListener(key);
        });
        this.keyboardListeners.clear();

        this.politeRegion = null;
        this.assertiveRegion = null;
    }

    /**
     * Check if reduced motion is preferred
     */
    static prefersReducedMotion(): boolean {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return false;
        }

        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Check if high contrast is preferred
     */
    static prefersHighContrast(): boolean {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return false;
        }

        return window.matchMedia('(prefers-contrast: high)').matches;
    }

    /**
     * Detect if user is likely using a screen reader
     */
    static detectScreenReader(): boolean {
        if (typeof navigator === 'undefined') {
            return false;
        }

        const userAgent = navigator.userAgent.toLowerCase();
        const screenReaders = ['nvda', 'jaws', 'voiceover', 'narrator', 'orca'];

        return screenReaders.some(sr => userAgent.includes(sr));
    }

    /**
     * Get recommended accessibility settings based on user environment
     */
    static getRecommendedSettings(): Partial<StreamingDisplayAccessibilitySettings> {
        return {
            reduceMotion: StreamingDisplayAccessibilityService.prefersReducedMotion(),
            useHighContrastIndicators: StreamingDisplayAccessibilityService.prefersHighContrast(),
            enableScreenReaderAnnouncements: StreamingDisplayAccessibilityService.detectScreenReader(),
            skipAnimations: StreamingDisplayAccessibilityService.prefersReducedMotion(),
        };
    }
}

/**
 * Global accessibility service instance
 */
let globalAccessibilityService: StreamingDisplayAccessibilityService | null = null;

/**
 * Get or create global accessibility service
 */
export function getAccessibilityService(settings?: StreamingDisplayAccessibilitySettings): StreamingDisplayAccessibilityService {
    if (!globalAccessibilityService) {
        const defaultSettings: StreamingDisplayAccessibilitySettings = {
            reduceMotion: false,
            enableScreenReaderAnnouncements: true,
            skipAnimations: false,
            useInstantDisplay: false,
            announceProgress: true,
            useHighContrastIndicators: false,
            ...StreamingDisplayAccessibilityService.getRecommendedSettings(),
            ...settings,
        };

        globalAccessibilityService = new StreamingDisplayAccessibilityService(defaultSettings);
    } else if (settings) {
        globalAccessibilityService.updateSettings(settings);
    }

    return globalAccessibilityService;
}

/**
 * Clean up global accessibility service
 */
export function cleanupAccessibilityService(): void {
    if (globalAccessibilityService) {
        globalAccessibilityService.cleanup();
        globalAccessibilityService = null;
    }
}