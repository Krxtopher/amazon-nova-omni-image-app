/**
 * Configuration types for streaming prompt enhancement and word-by-word display
 */

import type { WordDisplayConfig } from './streaming';

/**
 * Feature flags for streaming display functionality
 */
export interface StreamingDisplayFeatureFlags {
    /** Enable/disable streaming prompt enhancement */
    enableStreamingEnhancement: boolean;

    /** Enable/disable word-by-word display */
    enableWordByWordDisplay: boolean;

    /** Enable/disable fade-in animations */
    enableFadeInAnimations: boolean;

    /** Enable/disable typing cursor indicator */
    enableTypingCursor: boolean;

    /** Enable/disable enhanced punctuation delays */
    enablePunctuationDelays: boolean;

    /** Enable/disable random delay variation */
    enableRandomDelays: boolean;
}

/**
 * Accessibility settings for streaming display
 */
export interface StreamingDisplayAccessibilitySettings {
    /** Reduce motion for motion-sensitive users */
    reduceMotion: boolean;

    /** Enable screen reader announcements */
    enableScreenReaderAnnouncements: boolean;

    /** Skip animations entirely for accessibility */
    skipAnimations: boolean;

    /** Use instant display instead of word-by-word */
    useInstantDisplay: boolean;

    /** Announce display progress to screen readers */
    announceProgress: boolean;

    /** Use high contrast indicators */
    useHighContrastIndicators: boolean;
}

/**
 * Performance settings for streaming display
 */
export interface StreamingDisplayPerformanceSettings {
    /** Maximum concurrent displays allowed */
    maxConcurrentDisplays: number;

    /** Buffer size for rapid token streams */
    tokenBufferSize: number;

    /** Use requestAnimationFrame for animations */
    useRequestAnimationFrame: boolean;

    /** Enable GPU acceleration for animations */
    enableGPUAcceleration: boolean;

    /** Debounce rapid updates (ms) */
    updateDebounceMs: number;
}

/**
 * Complete configuration for streaming prompt display system
 */
export interface StreamingPromptDisplayConfig {
    /** Feature flags */
    features: StreamingDisplayFeatureFlags;

    /** Accessibility settings */
    accessibility: StreamingDisplayAccessibilitySettings;

    /** Performance settings */
    performance: StreamingDisplayPerformanceSettings;

    /** Word display timing and animation configuration */
    wordDisplay: WordDisplayConfig;

    /** Debug mode for development */
    debug: boolean;
}

/**
 * User preferences that can be customized
 */
export interface StreamingDisplayUserPreferences {
    /** User's motion preference */
    prefersReducedMotion?: boolean;

    /** User's animation preference */
    prefersNoAnimations?: boolean;

    /** User's screen reader usage */
    usesScreenReader?: boolean;

    /** User's preferred display speed (multiplier) */
    displaySpeedMultiplier?: number;

    /** User's preferred animation duration (multiplier) */
    animationSpeedMultiplier?: number;
}

/**
 * Configuration preset types
 */
export type StreamingDisplayPreset =
    | 'default'
    | 'fast'
    | 'slow'
    | 'accessible'
    | 'minimal'
    | 'performance';

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}