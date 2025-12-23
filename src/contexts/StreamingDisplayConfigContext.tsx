/**
 * StreamingDisplayConfigContext - React context for streaming display configuration
 * 
 * This context provides configuration management for the streaming prompt enhancement
 * and word-by-word display system throughout the React component tree.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
    StreamingDisplayConfigService,
    streamingDisplayConfig as defaultConfigService,
} from '../services/StreamingDisplayConfigService';
import type {
    StreamingPromptDisplayConfig,
    StreamingDisplayUserPreferences,
    StreamingDisplayPreset,
} from '../types/config';

/**
 * Context value interface
 */
interface StreamingDisplayConfigContextValue {
    /** Current configuration */
    config: StreamingPromptDisplayConfig;

    /** Update configuration */
    updateConfig: (updates: Partial<StreamingPromptDisplayConfig>) => void;

    /** Apply a configuration preset */
    applyPreset: (preset: StreamingDisplayPreset) => void;

    /** Update user preferences */
    updateUserPreferences: (preferences: Partial<StreamingDisplayUserPreferences>) => void;

    /** Get user preferences */
    getUserPreferences: () => StreamingDisplayUserPreferences;

    /** Check if a feature is enabled */
    isFeatureEnabled: (feature: keyof StreamingPromptDisplayConfig['features']) => boolean;

    /** Reset to default configuration */
    reset: () => void;

    /** Configuration service instance */
    configService: StreamingDisplayConfigService;
}

/**
 * React context for streaming display configuration
 */
const StreamingDisplayConfigContext = createContext<StreamingDisplayConfigContextValue | null>(null);

/**
 * Props for the configuration provider
 */
interface StreamingDisplayConfigProviderProps {
    children: ReactNode;
    configService?: StreamingDisplayConfigService;
    initialConfig?: Partial<StreamingPromptDisplayConfig>;
}

/**
 * Provider component for streaming display configuration
 */
export function StreamingDisplayConfigProvider({
    children,
    configService = defaultConfigService,
    initialConfig,
}: StreamingDisplayConfigProviderProps) {
    const [config, setConfig] = useState<StreamingPromptDisplayConfig>(() => {
        if (initialConfig) {
            configService.updateConfig(initialConfig);
        }
        return configService.getConfig();
    });

    // Subscribe to configuration changes
    useEffect(() => {
        const unsubscribe = configService.subscribe((newConfig) => {
            setConfig(newConfig);
        });

        return unsubscribe;
    }, [configService]);

    // Memoized context value
    const contextValue: StreamingDisplayConfigContextValue = {
        config,
        updateConfig: useCallback((updates: Partial<StreamingPromptDisplayConfig>) => {
            configService.updateConfig(updates);
        }, [configService]),

        applyPreset: useCallback((preset: StreamingDisplayPreset) => {
            configService.applyPreset(preset);
        }, [configService]),

        updateUserPreferences: useCallback((preferences: Partial<StreamingDisplayUserPreferences>) => {
            configService.updateUserPreferences(preferences);
        }, [configService]),

        getUserPreferences: useCallback(() => {
            return configService.getUserPreferences();
        }, [configService]),

        isFeatureEnabled: useCallback((feature: keyof StreamingPromptDisplayConfig['features']) => {
            return configService.isFeatureEnabled(feature);
        }, [configService]),

        reset: useCallback(() => {
            configService.reset();
        }, [configService]),

        configService,
    };

    return (
        <StreamingDisplayConfigContext.Provider value={contextValue}>
            {children}
        </StreamingDisplayConfigContext.Provider>
    );
}

/**
 * Hook to use streaming display configuration
 */
export function useStreamingDisplayConfig(): StreamingDisplayConfigContextValue {
    const context = useContext(StreamingDisplayConfigContext);

    if (!context) {
        throw new Error(
            'useStreamingDisplayConfig must be used within a StreamingDisplayConfigProvider'
        );
    }

    return context;
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(feature: keyof StreamingPromptDisplayConfig['features']): boolean {
    const { isFeatureEnabled } = useStreamingDisplayConfig();
    return isFeatureEnabled(feature);
}

/**
 * Hook to get accessibility settings
 */
export function useAccessibilitySettings() {
    const { config } = useStreamingDisplayConfig();
    return config.accessibility;
}

/**
 * Hook to get performance settings
 */
export function usePerformanceSettings() {
    const { config } = useStreamingDisplayConfig();
    return config.performance;
}

/**
 * Hook for user preferences management
 */
export function useUserPreferences() {
    const { updateUserPreferences, getUserPreferences } = useStreamingDisplayConfig();

    return {
        preferences: getUserPreferences(),
        updatePreferences: updateUserPreferences,
    };
}

/**
 * Hook for configuration presets
 */
export function useConfigPresets() {
    const { applyPreset } = useStreamingDisplayConfig();

    const presets: StreamingDisplayPreset[] = [
        'default',
        'fast',
        'slow',
        'accessible',
        'minimal',
        'performance',
    ];

    return {
        presets,
        applyPreset,
    };
}