import { sqliteService } from '../services/sqliteService';
import { personaService } from '../services/personaService';
import type { AspectRatio, PromptEnhancement } from '../types';

/**
 * Migration utility to move UI settings from SQLite to localStorage
 * This ensures existing users don't lose their preferences when we switch stores
 */
export async function migrateUISettings(): Promise<void> {
    try {
        console.log('🔄 Starting UI settings migration from SQLite to localStorage...');

        // Check if migration has already been done
        const migrationFlag = localStorage.getItem('ui-settings-migrated');
        if (migrationFlag === 'true') {
            console.log('✅ UI settings migration already completed, skipping...');
            return;
        }

        // Initialize SQLite to read existing settings
        await sqliteService.init();

        // Migrate aspect ratio setting
        const savedRatio = await sqliteService.getSetting('selectedAspectRatio');
        if (savedRatio) {
            console.log('📐 Migrating aspect ratio:', savedRatio);
            // The uiStore will handle this automatically via Zustand persist
            const uiStore = JSON.parse(localStorage.getItem('ui-store') || '{}');
            uiStore.state = uiStore.state || {};
            uiStore.state.selectedAspectRatio = savedRatio as AspectRatio;
            localStorage.setItem('ui-store', JSON.stringify(uiStore));
        }

        // Migrate layout mode setting
        const savedLayoutMode = await sqliteService.getSetting('layoutMode');
        if (savedLayoutMode) {
            console.log('📱 Migrating layout mode:', savedLayoutMode);
            const uiStore = JSON.parse(localStorage.getItem('ui-store') || '{}');
            uiStore.state = uiStore.state || {};
            uiStore.state.layoutMode = savedLayoutMode as 'vertical' | 'horizontal';
            localStorage.setItem('ui-store', JSON.stringify(uiStore));
        }

        // Migrate prompt enhancement setting
        const savedEnhancement = await sqliteService.getSetting('selectedPromptEnhancement');
        if (savedEnhancement) {
            console.log('🎭 Migrating prompt enhancement:', savedEnhancement);
            let promptEnhancement = savedEnhancement as PromptEnhancement;

            // Handle legacy 'custom' enhancement
            if (promptEnhancement === 'custom') {
                const customPersonas = await personaService.getCustomPersonas();
                if (customPersonas.length > 0) {
                    promptEnhancement = customPersonas[0].id;
                } else {
                    promptEnhancement = 'off';
                }
            }

            const uiStore = JSON.parse(localStorage.getItem('ui-store') || '{}');
            uiStore.state = uiStore.state || {};
            uiStore.state.selectedPromptEnhancement = promptEnhancement;
            localStorage.setItem('ui-store', JSON.stringify(uiStore));
        }

        // Mark migration as completed
        localStorage.setItem('ui-settings-migrated', 'true');
        console.log('✅ UI settings migration completed successfully!');

    } catch (error) {
        console.warn('⚠️ UI settings migration failed, using defaults:', error);
        // Mark as migrated anyway to avoid repeated attempts
        localStorage.setItem('ui-settings-migrated', 'true');
    }
}