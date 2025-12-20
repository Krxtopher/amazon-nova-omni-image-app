import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AspectRatio, PromptEnhancement, EditSource } from '../types';

/**
 * UI state interface for app preferences and settings
 */
interface UIState {
    selectedAspectRatio: AspectRatio;
    selectedPromptEnhancement: PromptEnhancement;
    layoutMode: 'vertical' | 'horizontal';
}

/**
 * UI actions interface
 */
interface UIActions {
    setAspectRatio: (ratio: AspectRatio) => void;
    setPromptEnhancement: (enhancement: PromptEnhancement) => void;
    setLayoutMode: (mode: 'vertical' | 'horizontal') => void;
}

/**
 * Edit source state interface (non-persisted)
 */
interface EditSourceState {
    editSource: EditSource | null;
}

/**
 * Edit source actions interface
 */
interface EditSourceActions {
    setEditSource: (source: EditSource | null) => void;
    clearEditSource: () => void;
}

/**
 * Default values
 */
const DEFAULT_ASPECT_RATIO: AspectRatio = 'random';
const DEFAULT_PROMPT_ENHANCEMENT: PromptEnhancement = 'off';
const DEFAULT_LAYOUT_MODE: 'vertical' | 'horizontal' = 'vertical';

/**
 * Lightweight UI store using Zustand with localStorage persistence
 * 
 * This store handles fast-changing UI state that needs to be persisted
 * but doesn't require the robustness of SQLite. Uses localStorage for
 * instant synchronous updates with automatic persistence.
 * 
 * Separated from imageStore to avoid SQLite overhead for UI state changes.
 */
export const useUIStore = create<UIState & UIActions>()(
    persist(
        (set) => ({
            // State
            selectedAspectRatio: DEFAULT_ASPECT_RATIO,
            selectedPromptEnhancement: DEFAULT_PROMPT_ENHANCEMENT,
            layoutMode: DEFAULT_LAYOUT_MODE,

            // Actions - all synchronous for instant UI updates
            setAspectRatio: (ratio: AspectRatio) => {
                set({ selectedAspectRatio: ratio });
            },

            setPromptEnhancement: (enhancement: PromptEnhancement) => {
                set({ selectedPromptEnhancement: enhancement });
            },

            setLayoutMode: (mode: 'vertical' | 'horizontal') => {
                set({ layoutMode: mode });
            },
        }),
        {
            name: 'ui-store', // localStorage key
            // Only persist the state, not the actions
            partialize: (state) => ({
                selectedAspectRatio: state.selectedAspectRatio,
                selectedPromptEnhancement: state.selectedPromptEnhancement,
                layoutMode: state.layoutMode,
            }),
        }
    )
);

/**
 * Edit source store - non-persisted transient state
 * 
 * This store handles edit source data that should not persist between sessions.
 * Separated from the persisted UI store to ensure edit source data is always
 * cleared when the app is reloaded.
 */
export const useEditSourceStore = create<EditSourceState & EditSourceActions>()((set) => ({
    // State
    editSource: null,

    // Actions
    setEditSource: (source: EditSource | null) => {
        set({ editSource: source });
    },

    clearEditSource: () => {
        set({ editSource: null });
    },
}));