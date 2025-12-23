/**
 * useStreamingDisplayAccessibility - React hook for accessibility features
 * 
 * This hook provides accessibility features for streaming display components,
 * including screen reader announcements, keyboard navigation, and motion preferences.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStreamingDisplayConfig } from '../contexts';
import {
    StreamingDisplayAccessibilityService,
    getAccessibilityService,
    type AnnouncementType
} from '../services/StreamingDisplayAccessibilityService';

/**
 * Hook for streaming display accessibility features
 */
export function useStreamingDisplayAccessibility() {
    const { config } = useStreamingDisplayConfig();
    const accessibilityServiceRef = useRef<StreamingDisplayAccessibilityService | null>(null);

    // Initialize accessibility service
    useEffect(() => {
        accessibilityServiceRef.current = getAccessibilityService(config.accessibility);

        return () => {
            // Don't cleanup global service on unmount, let the provider handle it
        };
    }, [config.accessibility]);

    // Update settings when config changes
    useEffect(() => {
        if (accessibilityServiceRef.current) {
            accessibilityServiceRef.current.updateSettings(config.accessibility);
        }
    }, [config.accessibility]);

    /**
     * Announce message to screen readers
     */
    const announce = useCallback((
        message: string,
        type: AnnouncementType = 'status',
        priority: 'polite' | 'assertive' = 'polite'
    ) => {
        accessibilityServiceRef.current?.announce(message, type, priority);
    }, []);

    /**
     * Announce display progress
     */
    const announceProgress = useCallback((currentWord: number, totalWords: number, isComplete: boolean = false) => {
        accessibilityServiceRef.current?.announceProgress(currentWord, totalWords, isComplete);
    }, []);

    /**
     * Announce streaming status
     */
    const announceStreamingStatus = useCallback((
        status: 'starting' | 'enhancing' | 'displaying' | 'complete' | 'error',
        details?: string
    ) => {
        accessibilityServiceRef.current?.announceStreamingStatus(status, details);
    }, []);

    /**
     * Check if animations should be disabled
     */
    const shouldDisableAnimations = useCallback(() => {
        return config.accessibility.skipAnimations ||
            config.accessibility.reduceMotion ||
            StreamingDisplayAccessibilityService.prefersReducedMotion();
    }, [config.accessibility.skipAnimations, config.accessibility.reduceMotion]);

    /**
     * Check if instant display should be used
     */
    const shouldUseInstantDisplay = useCallback(() => {
        return config.accessibility.useInstantDisplay || shouldDisableAnimations();
    }, [config.accessibility.useInstantDisplay, shouldDisableAnimations]);

    /**
     * Get accessibility attributes for a component
     */
    const getAccessibilityAttributes = useCallback((
        isActive: boolean,
        role: string = 'status'
    ) => {
        return {
            role,
            'aria-live': config.accessibility.enableScreenReaderAnnouncements ? 'polite' as const : 'off' as const,
            'aria-busy': isActive,
            'aria-atomic': false,
            'data-streaming-display-active': isActive.toString(),
        };
    }, [config.accessibility.enableScreenReaderAnnouncements]);

    /**
     * Get keyboard navigation instructions
     */
    const getKeyboardInstructions = useCallback(() => {
        if (!config.accessibility.enableScreenReaderAnnouncements) {
            return '';
        }

        return 'Press Escape to skip to end, Space to pause/resume, Plus to speed up, Minus to slow down.';
    }, [config.accessibility.enableScreenReaderAnnouncements]);

    return {
        announce,
        announceProgress,
        announceStreamingStatus,
        shouldDisableAnimations,
        shouldUseInstantDisplay,
        getAccessibilityAttributes,
        getKeyboardInstructions,
        settings: config.accessibility,
    };
}

/**
 * Hook for keyboard navigation in streaming display
 */
export function useStreamingDisplayKeyboard(
    onSkipToEnd?: () => void,
    onTogglePause?: () => void,
    onAdjustSpeed?: (multiplier: number) => void
) {
    const { settings } = useStreamingDisplayAccessibility();

    useEffect(() => {
        if (!settings.enableScreenReaderAnnouncements) {
            return;
        }

        const handleSkip = () => onSkipToEnd?.();
        const handleToggle = () => onTogglePause?.();
        const handleSpeedUp = (event: CustomEvent) => onAdjustSpeed?.(event.detail.multiplier);

        // Listen for custom accessibility events
        document.addEventListener('streaming-display-skip', handleSkip);
        document.addEventListener('streaming-display-toggle', handleToggle);
        document.addEventListener('streaming-display-speed', handleSpeedUp as EventListener);

        return () => {
            document.removeEventListener('streaming-display-skip', handleSkip);
            document.removeEventListener('streaming-display-toggle', handleToggle);
            document.removeEventListener('streaming-display-speed', handleSpeedUp as EventListener);
        };
    }, [onSkipToEnd, onTogglePause, onAdjustSpeed, settings.enableScreenReaderAnnouncements]);
}

/**
 * Hook for motion preferences
 */
export function useMotionPreferences() {
    const { config } = useStreamingDisplayConfig();

    const prefersReducedMotion = StreamingDisplayAccessibilityService.prefersReducedMotion();
    const shouldReduceMotion = config.accessibility.reduceMotion || prefersReducedMotion;
    const shouldSkipAnimations = config.accessibility.skipAnimations || shouldReduceMotion;

    return {
        prefersReducedMotion,
        shouldReduceMotion,
        shouldSkipAnimations,
        enableAnimations: !shouldSkipAnimations,
    };
}

/**
 * Hook for high contrast preferences
 */
export function useContrastPreferences() {
    const { config } = useStreamingDisplayConfig();

    const prefersHighContrast = StreamingDisplayAccessibilityService.prefersHighContrast();
    const useHighContrast = config.accessibility.useHighContrastIndicators || prefersHighContrast;

    return {
        prefersHighContrast,
        useHighContrast,
        getContrastClasses: (isActive: boolean = false) => {
            if (!useHighContrast) return '';

            return isActive
                ? 'bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white font-bold'
                : 'text-black dark:text-white';
        },
    };
}