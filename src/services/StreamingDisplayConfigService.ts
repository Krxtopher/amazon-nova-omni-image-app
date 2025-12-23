/**
 * StreamingDisplayConfigService - Configuration management for streaming display system
 * 
 * This service manages configuration, feature flags, accessibility settings, and user preferences
 * for the streaming prompt enhancement and word-by-word display system.
 */

import type {
    StreamingPromptDisplayConfig,
    StreamingDisplayFeatureFlags,
    StreamingDisplayAccessibilitySettings,
    StreamingDisplayPerformanceSettings,
    StreamingDisplayUserPreferences,
    StreamingDisplayPreset,
    ConfigValidationResult
} from '../types/config';
import type { WordDisplayConfig } from '../types/streaming';

/**
 * Default feature flags configuration
 */
export const DEFAULT_FEATURE_FLAGS: StreamingDisplayFeatureFlags = {
    enableStreamingEnhancement: true,
    enableWordByWordDisplay: true,
    enableFadeInAnimations: true,
    enableTypingCursor: true,
    enablePunctuationDelays: true,
    enableRandomDelays: true,
};

/**
 * Default accessibility settings
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: StreamingDisplayAccessibilitySettings = {
    reduceMotion: false,
    enableScreenReaderAnnouncements: true,
    skipAnimations: false,
    useInstantDisplay: false,
    announceProgress: true,
    useHighContrastIndicators: false,
};

/**
 * Default performance settings
 */
export const DEFAULT_PERFORMANCE_SETTINGS: StreamingDisplayPerformanceSettings = {
    maxConcurrentDisplays: 10,
    tokenBufferSize: 100,
    useRequestAnimationFrame: true,
    enableGPUAcceleration: true,
    updateDebounceMs: 16, // ~60fps
};

/**
 * Default word display configuration
 */
export const DEFAULT_WORD_DISPLAY_CONFIG: WordDisplayConfig = {
    baseDelay: { min: 50, max: 200 },
    longWordThreshold: 8,
    longWordDelayMultiplier: 1.5,
    punctuationDelays: {
        '.': 300,
        '!': 300,
        '?': 300,
        ',': 150,
        ';': 200,
        ':': 200,
    },
    fadeInDuration: { min: 100, max: 300 },
};

/**
 * Default complete configuration
 */
export const DEFAULT_STREAMING_DISPLAY_CONFIG: StreamingPromptDisplayConfig = {
    features: DEFAULT_FEATURE_FLAGS,
    accessibility: DEFAULT_ACCESSIBILITY_SETTINGS,
    performance: DEFAULT_PERFORMANCE_SETTINGS,
    wordDisplay: DEFAULT_WORD_DISPLAY_CONFIG,
    debug: false,
};

/**
 * Configuration presets for different use cases
 */
export const CONFIG_PRESETS: Record<StreamingDisplayPreset, Partial<StreamingPromptDisplayConfig>> = {
    default: {},

    fast: {
        wordDisplay: {
            ...DEFAULT_WORD_DISPLAY_CONFIG,
            baseDelay: { min: 25, max: 100 },
            fadeInDuration: { min: 50, max: 150 },
        },
        features: {
            ...DEFAULT_FEATURE_FLAGS,
            enablePunctuationDelays: false,
        },
    },

    slow: {
        wordDisplay: {
            ...DEFAULT_WORD_DISPLAY_CONFIG,
            baseDelay: { min: 100, max: 400 },
            fadeInDuration: { min: 200, max: 500 },
            longWordDelayMultiplier: 2.0,
        },
    },

    accessible: {
        accessibility: {
            ...DEFAULT_ACCESSIBILITY_SETTINGS,
            reduceMotion: true,
            skipAnimations: true,
            enableScreenReaderAnnouncements: true,
            announceProgress: true,
            useHighContrastIndicators: true,
        },
        features: {
            ...DEFAULT_FEATURE_FLAGS,
            enableFadeInAnimations: false,
            enableRandomDelays: false,
        },
    },

    minimal: {
        features: {
            ...DEFAULT_FEATURE_FLAGS,
            enableFadeInAnimations: false,
            enableTypingCursor: false,
            enablePunctuationDelays: false,
            enableRandomDelays: false,
        },
        accessibility: {
            ...DEFAULT_ACCESSIBILITY_SETTINGS,
            skipAnimations: true,
        },
    },

    performance: {
        performance: {
            ...DEFAULT_PERFORMANCE_SETTINGS,
            maxConcurrentDisplays: 5,
            tokenBufferSize: 50,
            updateDebounceMs: 32, // ~30fps
        },
        features: {
            ...DEFAULT_FEATURE_FLAGS,
            enableFadeInAnimations: false,
        },
    },
};

/**
 * Service for managing streaming display configuration
 */
export class StreamingDisplayConfigService {
    private config: StreamingPromptDisplayConfig;
    private userPreferences: StreamingDisplayUserPreferences;
    private listeners: Set<(config: StreamingPromptDisplayConfig) => void> = new Set();

    constructor(initialConfig?: Partial<StreamingPromptDisplayConfig>) {
        this.config = this.mergeConfig(DEFAULT_STREAMING_DISPLAY_CONFIG, initialConfig);
        this.userPreferences = this.detectUserPreferences();
        this.applyUserPreferences();
    }

    /**
     * Get current configuration
     */
    getConfig(): StreamingPromptDisplayConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<StreamingPromptDisplayConfig>): void {
        const newConfig = this.mergeConfig(this.config, updates);
        const validation = this.validateConfig(newConfig);

        if (!validation.isValid) {
            return;
        }

        // Only log warnings for critical configuration issues
        const criticalWarnings = validation.warnings.filter(w => w.includes('performance') || w.includes('accessibility'));
        if (criticalWarnings.length > 0) {
            console.warn('Configuration warnings:', criticalWarnings);
        }

        this.config = newConfig;
        this.notifyListeners();
    }

    /**
     * Apply a configuration preset
     */
    applyPreset(preset: StreamingDisplayPreset): void {
        const presetConfig = CONFIG_PRESETS[preset];
        this.updateConfig(presetConfig);
    }

    /**
     * Update user preferences
     */
    updateUserPreferences(preferences: Partial<StreamingDisplayUserPreferences>): void {
        this.userPreferences = { ...this.userPreferences, ...preferences };
        this.applyUserPreferences();
    }

    /**
     * Get user preferences
     */
    getUserPreferences(): StreamingDisplayUserPreferences {
        return { ...this.userPreferences };
    }

    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature: keyof StreamingDisplayFeatureFlags): boolean {
        return this.config.features[feature];
    }

    /**
     * Get accessibility setting
     */
    getAccessibilitySetting<K extends keyof StreamingDisplayAccessibilitySettings>(
        setting: K
    ): StreamingDisplayAccessibilitySettings[K] {
        return this.config.accessibility[setting];
    }

    /**
     * Get performance setting
     */
    getPerformanceSetting<K extends keyof StreamingDisplayPerformanceSettings>(
        setting: K
    ): StreamingDisplayPerformanceSettings[K] {
        return this.config.performance[setting];
    }

    /**
     * Get word display configuration with user preferences applied
     */
    getWordDisplayConfig(): WordDisplayConfig {
        const config = { ...this.config.wordDisplay };

        // Apply user speed multipliers
        if (this.userPreferences.displaySpeedMultiplier) {
            const multiplier = 1 / this.userPreferences.displaySpeedMultiplier;
            config.baseDelay.min *= multiplier;
            config.baseDelay.max *= multiplier;

            // Apply to punctuation delays
            Object.keys(config.punctuationDelays).forEach(key => {
                config.punctuationDelays[key] *= multiplier;
            });
        }

        if (this.userPreferences.animationSpeedMultiplier) {
            const multiplier = 1 / this.userPreferences.animationSpeedMultiplier;
            config.fadeInDuration.min *= multiplier;
            config.fadeInDuration.max *= multiplier;
        }

        return config;
    }

    /**
     * Subscribe to configuration changes
     */
    subscribe(listener: (config: StreamingPromptDisplayConfig) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Reset to default configuration
     */
    reset(): void {
        this.config = { ...DEFAULT_STREAMING_DISPLAY_CONFIG };
        this.applyUserPreferences();
        this.notifyListeners();
    }

    /**
     * Export configuration as JSON
     */
    exportConfig(): string {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from JSON
     */
    importConfig(configJson: string): boolean {
        try {
            const imported = JSON.parse(configJson);
            const validation = this.validateConfig(imported);

            if (validation.isValid) {
                this.config = imported;
                this.notifyListeners();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Detect user preferences from browser/system
     */
    private detectUserPreferences(): StreamingDisplayUserPreferences {
        const preferences: StreamingDisplayUserPreferences = {};

        // Detect reduced motion preference
        if (typeof window !== 'undefined' && window.matchMedia) {
            preferences.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        // Detect screen reader usage (basic heuristic)
        if (typeof navigator !== 'undefined') {
            preferences.usesScreenReader = navigator.userAgent.includes('NVDA') ||
                navigator.userAgent.includes('JAWS') ||
                navigator.userAgent.includes('VoiceOver');
        }

        return preferences;
    }

    /**
     * Apply user preferences to configuration
     */
    private applyUserPreferences(): void {
        const updates: Partial<StreamingPromptDisplayConfig> = {};

        // Apply reduced motion preference
        if (this.userPreferences.prefersReducedMotion) {
            updates.accessibility = {
                ...this.config.accessibility,
                reduceMotion: true,
                skipAnimations: true,
            };
            updates.features = {
                ...this.config.features,
                enableFadeInAnimations: false,
            };
        }

        // Apply no animations preference
        if (this.userPreferences.prefersNoAnimations) {
            updates.accessibility = {
                ...this.config.accessibility,
                skipAnimations: true,
            };
            updates.features = {
                ...this.config.features,
                enableFadeInAnimations: false,
            };
        }

        // Apply screen reader preference
        if (this.userPreferences.usesScreenReader) {
            updates.accessibility = {
                ...this.config.accessibility,
                enableScreenReaderAnnouncements: true,
                announceProgress: true,
            };
        }

        if (Object.keys(updates).length > 0) {
            this.config = this.mergeConfig(this.config, updates);
        }
    }

    /**
     * Merge configuration objects
     */
    private mergeConfig(
        base: StreamingPromptDisplayConfig,
        updates?: Partial<StreamingPromptDisplayConfig>
    ): StreamingPromptDisplayConfig {
        if (!updates) return base;

        return {
            features: { ...base.features, ...updates.features },
            accessibility: { ...base.accessibility, ...updates.accessibility },
            performance: { ...base.performance, ...updates.performance },
            wordDisplay: { ...base.wordDisplay, ...updates.wordDisplay },
            debug: updates.debug ?? base.debug,
        };
    }

    /**
     * Validate configuration
     */
    private validateConfig(config: StreamingPromptDisplayConfig): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate word display config
        if (config.wordDisplay.baseDelay.min < 0 || config.wordDisplay.baseDelay.max < 0) {
            errors.push('Base delay values must be non-negative');
        }

        if (config.wordDisplay.baseDelay.min > config.wordDisplay.baseDelay.max) {
            errors.push('Base delay minimum must be less than or equal to maximum');
        }

        if (config.wordDisplay.fadeInDuration.min < 0 || config.wordDisplay.fadeInDuration.max < 0) {
            errors.push('Fade-in duration values must be non-negative');
        }

        if (config.wordDisplay.fadeInDuration.min > config.wordDisplay.fadeInDuration.max) {
            errors.push('Fade-in duration minimum must be less than or equal to maximum');
        }

        if (config.wordDisplay.longWordThreshold < 1) {
            errors.push('Long word threshold must be at least 1');
        }

        if (config.wordDisplay.longWordDelayMultiplier < 1) {
            warnings.push('Long word delay multiplier less than 1 will make long words faster');
        }

        // Validate performance settings
        if (config.performance.maxConcurrentDisplays < 1) {
            errors.push('Maximum concurrent displays must be at least 1');
        }

        if (config.performance.tokenBufferSize < 1) {
            errors.push('Token buffer size must be at least 1');
        }

        if (config.performance.updateDebounceMs < 0) {
            errors.push('Update debounce must be non-negative');
        }

        // Validate punctuation delays
        Object.entries(config.wordDisplay.punctuationDelays).forEach(([punct, delay]) => {
            if (delay < 0) {
                errors.push(`Punctuation delay for '${punct}' must be non-negative`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Notify configuration change listeners
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.config);
            } catch (error) {
                // Silently handle listener errors to prevent cascading failures
            }
        });
    }
}

/**
 * Global configuration service instance
 */
export const streamingDisplayConfig = new StreamingDisplayConfigService();