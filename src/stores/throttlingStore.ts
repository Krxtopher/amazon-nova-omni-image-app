import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThrottlingConfig, ModelThrottleConfig, ThrottlingStats } from '../types/throttling';
import { DEFAULT_THROTTLING_CONFIG } from '../types/throttling';
import { ThrottlingService } from '../services/ThrottlingService';

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
    setGlobalEnabled: (enabled: boolean) => void;
    refreshStats: () => void;
    resetToDefaults: () => void;
}

/**
 * Throttling store using Zustand with localStorage persistence
 * 
 * Manages throttling configuration and provides real-time statistics
 * for the Bedrock API request throttling system.
 */
export const useThrottlingStore = create<ThrottlingState & ThrottlingActions>()(
    persist(
        (set, get) => {
            // Initialize throttling service with persisted config
            let throttlingService: ThrottlingService;

            const initializeService = (config: ThrottlingConfig) => {
                throttlingService = ThrottlingService.getInstance(config);

                // Set up config change listener to update service
                throttlingService.onConfigChange((newConfig) => {
                    set({ config: newConfig });
                });
            };

            return {
                // State
                config: DEFAULT_THROTTLING_CONFIG,
                stats: null,

                // Actions
                updateConfig: (config: ThrottlingConfig) => {
                    set({ config });
                    if (throttlingService) {
                        throttlingService.updateConfig(config);
                    }
                },

                updateModelConfig: (modelId: string, modelConfig: ModelThrottleConfig) => {
                    const currentConfig = get().config;
                    const newConfig: ThrottlingConfig = {
                        ...currentConfig,
                        models: {
                            ...currentConfig.models,
                            [modelId]: modelConfig,
                        },
                    };
                    get().updateConfig(newConfig);
                },

                setGlobalEnabled: (enabled: boolean) => {
                    const currentConfig = get().config;
                    const newConfig: ThrottlingConfig = {
                        ...currentConfig,
                        globalEnabled: enabled,
                    };
                    get().updateConfig(newConfig);
                },

                refreshStats: () => {
                    if (throttlingService) {
                        const stats = throttlingService.getStats();
                        set({ stats });
                    }
                },

                resetToDefaults: () => {
                    get().updateConfig(DEFAULT_THROTTLING_CONFIG);
                },

                // Initialize service when store is created
                _initialize: (config: ThrottlingConfig) => {
                    initializeService(config);
                },
            };
        },
        {
            name: 'throttling-store',
            partialize: (state) => ({
                config: state.config,
                // Don't persist stats as they're runtime data
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Initialize service with rehydrated config
                    const throttlingService = ThrottlingService.getInstance(state.config);

                    // Set up periodic stats refresh
                    const refreshInterval = setInterval(() => {
                        const stats = throttlingService.getStats();
                        useThrottlingStore.setState({ stats });
                    }, 1000); // Refresh every second

                    // Store cleanup function globally (you might want to handle this better)
                    (window as any).__throttlingStatsCleanup = () => {
                        clearInterval(refreshInterval);
                    };
                }
            },
        }
    )
);

// Helper function to get throttling service instance
export const getThrottlingService = (): ThrottlingService => {
    const config = useThrottlingStore.getState().config;
    return ThrottlingService.getInstance(config);
};