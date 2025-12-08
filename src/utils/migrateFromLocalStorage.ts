import { sqliteService } from '../services/sqliteService';
import type { GeneratedImage, AspectRatio } from '../types';

/**
 * Migrate data from localStorage to SQLite database
 * This utility helps users transition from the old localStorage-based storage
 * to the new SQLite-based storage system
 */
export async function migrateFromLocalStorage(): Promise<{
    success: boolean;
    migratedImages: number;
    error?: string;
}> {
    try {
        // Check if there's data in localStorage
        const localStorageKey = 'image-generator-storage';
        const storedData = localStorage.getItem(localStorageKey);

        if (!storedData) {
            return {
                success: true,
                migratedImages: 0,
            };
        }

        // Parse the localStorage data
        const parsed = JSON.parse(storedData);

        if (!parsed.state) {
            return {
                success: true,
                migratedImages: 0,
            };
        }

        // Initialize SQLite
        await sqliteService.init();

        let migratedCount = 0;

        // Migrate images
        if (parsed.state.images && Array.isArray(parsed.state.images)) {
            for (const img of parsed.state.images) {
                try {
                    const image: GeneratedImage = {
                        id: img.id,
                        url: img.url,
                        prompt: img.prompt,
                        status: img.status,
                        aspectRatio: img.aspectRatio,
                        width: img.width,
                        height: img.height,
                        createdAt: new Date(img.createdAt),
                        error: img.error,
                    };

                    await sqliteService.addImage(image);
                    migratedCount++;
                } catch (error) {
                    console.error('Failed to migrate image:', img.id, error);
                }
            }
        }

        // Migrate aspect ratio setting
        if (parsed.state.selectedAspectRatio) {
            await sqliteService.setSetting(
                'selectedAspectRatio',
                parsed.state.selectedAspectRatio as AspectRatio
            );
        }

        // Clear localStorage after successful migration
        localStorage.removeItem(localStorageKey);

        return {
            success: true,
            migratedImages: migratedCount,
        };
    } catch (error) {
        console.error('Migration failed:', error);
        return {
            success: false,
            migratedImages: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
    const localStorageKey = 'image-generator-storage';
    const storedData = localStorage.getItem(localStorageKey);
    return storedData !== null;
}
