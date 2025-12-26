import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThrottlingConfig, ModelThrottleConfig, ThrottlingStats } from '../types/throttling';
import { DEFAULT_THROTTLING_CONFIG } from '../types/throttling';

/**
 * Throttling store state interface
 */
interface ThrottlingState {
    config: ThrottlingConfig;
    stats: ThrottlingStats | null;
}

/**
 * Throttling store actions interface
 */
interface ThrottlingActions {
    updateConfig: (config: ThrottlingConfig) => void;
    updateModelConfig: (modelId: string, modelConfig: ModelThrottleConfig) => void;
    refreshStats: () => void;
    resetToDefaults: () => void;
}

/**
 * Throttling store using Zustand with localStorage persistence
 * 
 * NOTE: Throttling has been disabled but UI settings are preserved
 * for potential future use. This store maintains the configuration
 * interface but does not apply any actual throttling.
 */
export const useThrottlingStore = create<ThrottlingState & ThrottlingActions>()(
    persist(
        (set, get) => ({
            // State
            config: DEFAULT_THROTTLING_CONFIG,
            stats: null,

            // Actions
            updateConfig: (config: ThrottlingConfig) => {
                set({ config });
                // Note: No throttling service to update since throttling is disabled
            },

            updateModelConfig: (modelId: string, modelConfig: ModelThrottleConfig) => {
                const currentConfig = get().config;
                const newConfig: ThrottlingConfig = {
                    ...currentConfig,
                    models: {
                        ...currentConfig.models,
                        [modelId]: {
                            ...modelConfig,
                            enabled: true, // Always keep enabled for UI consistency
                        },
                    },
                };
                get().updateConfig(newConfig);
            },

            refreshStats: () => {
                // Note: No stats to refresh since throttling is disabled
                set({ stats: null });
            },

            resetToDefaults: () => {
                get().updateConfig(DEFAULT_THROTTLING_CONFIG);
            },
        }),
        {
            name: 'throttling-store',
            partialize: (state) => ({
                config: state.config,
                // Don't persist stats as they're runtime data
            }),
        }
    )
);

// Helper function kept for compatibility but returns null since throttling is disabled
export const getThrottlingService = (): null => {
    return null;
};