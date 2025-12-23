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

/**
 * Default feature flags configuration
 */
export const DEFAULT_FEATURE_FLAGS: StreamingDisplayFeatureFlags = {
    enableStreamingEnhancement: true,
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
 * Default complete configuration
 */
export const DEFAULT_STREAMING_DISPLAY_CONFIG: StreamingPromptDisplayConfig = {
    features: DEFAULT_FEATURE_FLAGS,
    accessibility: DEFAULT_ACCESSIBILITY_SETTINGS,
    performance: DEFAULT_PERFORMANCE_SETTINGS,
    debug: false,
};

/**
 * Configuration presets for different use cases
 */
export const CONFIG_PRESETS: Record<StreamingDisplayPreset, Partial<StreamingPromptDisplayConfig>> = {
    default: {},

    fast: {
        features: {
            ...DEFAULT_FEATURE_FLAGS,
            enablePunctuationDelays: false,
        },
    },

    slow: {
        features: {
            ...DEFAULT_FEATURE_FLAGS,
            enablePunctuationDelays: true,
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
            debug: updates.debug ?? base.debug,
        };
    }

    /**
     * Validate configuration
     */
    private validateConfig(config: StreamingPromptDisplayConfig): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

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