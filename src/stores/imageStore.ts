import { create } from 'zustand';
import type { GeneratedImage, GeneratedText, GalleryItem, EditSource, AspectRatio, PromptEnhancement } from '../types';
import { personaService } from '../services/personaService';
import { sqliteService } from '../services/sqliteService';

/**
 * Gallery store state interface
 */
interface ImageStoreState {
    // State
    images: GeneratedImage[]; // Metadata only, URLs loaded on demand
    textItems: GeneratedText[];
    selectedAspectRatio: AspectRatio;
    selectedPromptEnhancement: PromptEnhancement;
    editSource: EditSource | null;
    isGenerating: boolean;
    isLoading: boolean;
    // Cache for loaded image URLs
    imageDataCache: Map<string, string>;
}

/**
 * Gallery store actions interface
 */
interface ImageStoreActions {
    // Actions
    addImage: (image: GeneratedImage) => Promise<void>;
    addTextItem: (textItem: GeneratedText) => void;
    updateImage: (id: string, updates: Partial<GeneratedImage>) => Promise<void>;
    deleteImage: (id: string) => Promise<void>;
    deleteTextItem: (id: string) => void;
    setAspectRatio: (ratio: AspectRatio) => Promise<void>;
    setPromptEnhancement: (persona: PromptEnhancement) => Promise<void>;
    setEditSource: (source: EditSource | null) => void;
    clearEditSource: () => void;
    loadImages: () => Promise<void>;
    loadImageData: (id: string) => Promise<string | null>; // Load image URL on demand
    getAllItems: () => GalleryItem[];
    getItemsPaginated: (offset: number, limit: number) => Promise<GalleryItem[]>;
    getTotalItemCount: () => number;
    initialize: () => Promise<void>;
}

/**
 * Combined store interface
 */
export type ImageStore = ImageStoreState & ImageStoreActions;

/**
 * Default aspect ratio
 */
const DEFAULT_ASPECT_RATIO: AspectRatio = 'random';

/**
 * Default persona
 */
const DEFAULT_PROMPT_ENHANCEMENT: PromptEnhancement = 'off';

/**
 * Image store using Zustand with SQLite persistence
 * Manages the state for generated images, aspect ratio selection, and edit source
 * Requirements: 3.1 - Persist images to SQLite database via IndexedDB
 */
export const useImageStore = create<ImageStore>()((set) => ({
    // Initial state
    images: [],
    textItems: [],
    selectedAspectRatio: DEFAULT_ASPECT_RATIO,
    selectedPromptEnhancement: DEFAULT_PROMPT_ENHANCEMENT,
    editSource: null,
    isGenerating: false,
    isLoading: true,
    imageDataCache: new Map(),

    // Actions

    /**
     * Initialize the store by loading data from SQLite
     */
    initialize: async () => {
        try {
            set({ isLoading: true });
            await sqliteService.init();

            // Delete incomplete images from database first
            await sqliteService.deleteImagesByStatus(['pending', 'queued', 'generating', 'error']);

            // Load only image metadata (not the actual image data)
            const imageMetadata = await sqliteService.getAllImageMetadata();



            // Load text items from localStorage (temporary solution)
            const textItemsJson = localStorage.getItem('textItems');
            const textItems: GeneratedText[] = textItemsJson ?
                JSON.parse(textItemsJson).map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                })) : [];

            // Load aspect ratio setting
            const savedRatio = await sqliteService.getSetting('selectedAspectRatio');
            const aspectRatio = (savedRatio as AspectRatio) || DEFAULT_ASPECT_RATIO;

            // Migrate old custom persona if needed
            await personaService.migrateOldCustomPersona();

            // Load persona setting
            const savedEnhancement = await sqliteService.getSetting('selectedPromptEnhancement');
            let promptEnhancement = (savedEnhancement as PromptEnhancement) || DEFAULT_PROMPT_ENHANCEMENT;

            // If the saved enhancement was 'custom', we need to check if we have any custom personas
            // and select the first one, or fall back to 'off'
            if (promptEnhancement === 'custom') {
                const customPersonas = await personaService.getCustomPersonas();
                if (customPersonas.length > 0) {
                    promptEnhancement = customPersonas[0].id;
                } else {
                    promptEnhancement = 'off';
                }
            }

            set({
                images: imageMetadata,
                textItems,
                selectedAspectRatio: aspectRatio,
                selectedPromptEnhancement: promptEnhancement,
                isLoading: false
            });
        } catch (error) {
            console.error('Failed to initialize store:', error);
            set({ isLoading: false });
        }
    },

    /**
     * Load image metadata from the database
     */
    loadImages: async () => {
        try {
            const imageMetadata = await sqliteService.getAllImageMetadata();
            set({ images: imageMetadata });
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    },

    /**
     * Load image data on demand (with caching)
     */
    loadImageData: async (id: string): Promise<string | null> => {
        const state = useImageStore.getState();

        // Check cache first
        if (state.imageDataCache.has(id)) {
            return state.imageDataCache.get(id)!;
        }

        try {
            const imageData = await sqliteService.getImageData(id);
            if (imageData) {
                // Cache the loaded URL
                set((state) => ({
                    imageDataCache: new Map(state.imageDataCache).set(id, imageData.url)
                }));
                return imageData.url;
            }
            return null;
        } catch (error) {
            console.error('Failed to load image data:', error);
            return null;
        }
    },

    /**
     * Add a new image to the gallery
     * New images are added at the beginning of the array (newest first)
     * UI update is immediate, database persistence happens asynchronously
     * Requirements: 2.1, 3.3
     */
    addImage: async (image: GeneratedImage) => {
        // Update UI immediately for responsive feel
        set((state) => ({
            images: [image, ...state.images],
        }));

        // Persist to database asynchronously (don't block UI)
        sqliteService.addImage(image).catch((error) => {
            console.error('Failed to persist image to database:', error);
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        });
    },

    /**
     * Add a new text item to the gallery
     * New text items are added at the beginning of the array (newest first)
     * UI update is immediate, localStorage persistence happens asynchronously
     */
    addTextItem: (textItem: GeneratedText) => {
        // Update UI immediately for responsive feel
        set((state) => ({
            textItems: [textItem, ...state.textItems],
        }));

        // Persist to localStorage asynchronously (don't block UI)
        try {
            const currentState = useImageStore.getState();
            localStorage.setItem('textItems', JSON.stringify(currentState.textItems));
        } catch (error) {
            console.error('Failed to persist text item to localStorage:', error);
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        }
    },

    /**
     * Update an existing image by ID
     * Used to update status, URL, or error information
     * UI update is immediate, database persistence happens asynchronously
     * Requirements: 1.4, 1.5
     */
    updateImage: async (id: string, updates: Partial<GeneratedImage>) => {
        // Update UI immediately for responsive feel
        set((state) => ({
            images: state.images.map((img) =>
                img.id === id ? { ...img, ...updates } : img
            ),
        }));

        // Persist to database asynchronously (don't block UI)
        sqliteService.updateImage(id, updates).catch((error) => {
            console.error('Failed to persist image update to database:', error);
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        });
    },

    /**
     * Delete an image from the gallery by ID
     * UI update is immediate, database persistence happens asynchronously
     * Requirements: 4.2
     */
    deleteImage: async (id: string) => {
        // Update UI immediately for responsive feel
        set((state) => {
            const newCache = new Map(state.imageDataCache);
            newCache.delete(id); // Remove from cache
            return {
                images: state.images.filter((img) => img.id !== id),
                imageDataCache: newCache,
            };
        });

        // Persist to database asynchronously (don't block UI)
        sqliteService.deleteImage(id).catch((error) => {
            console.error('Failed to persist image deletion to database:', error);
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        });
    },

    /**
     * Delete a text item from the gallery by ID
     * UI update is immediate, localStorage persistence happens asynchronously
     */
    deleteTextItem: (id: string) => {
        // Update UI immediately for responsive feel
        set((state) => ({
            textItems: state.textItems.filter((item) => item.id !== id),
        }));

        // Persist to localStorage asynchronously (don't block UI)
        try {
            const currentState = useImageStore.getState();
            localStorage.setItem('textItems', JSON.stringify(currentState.textItems));
        } catch (error) {
            console.error('Failed to persist text item deletion to localStorage:', error);
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        }
    },

    /**
     * Set the selected aspect ratio for new image generation
     * UI update is immediate, database persistence happens asynchronously
     * Requirements: 2.1, 2.5
     */
    setAspectRatio: async (ratio: AspectRatio) => {
        // Update UI immediately for responsive feel
        set({ selectedAspectRatio: ratio });

        // Persist to database asynchronously (don't block UI)
        sqliteService.setSetting('selectedAspectRatio', ratio).catch((error) => {
            console.error('Failed to persist aspect ratio setting to database:', error);
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        });
    },

    /**
     * Set the selected persona for new image generation
     * UI update is immediate, database persistence happens asynchronously
     */
    setPromptEnhancement: async (persona: PromptEnhancement) => {
        // Update UI immediately for responsive feel
        set({ selectedPromptEnhancement: persona });

        // Persist to database asynchronously (don't block UI)
        sqliteService.setSetting('selectedPromptEnhancement', persona).catch((error) => {
            console.error('Failed to persist persona setting to database:', error);
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        });
    },

    /**
     * Set the edit source image
     * Requirements: 5.2, 6.3
     */
    setEditSource: (source: EditSource | null) => {
        set({ editSource: source });
    },

    /**
     * Clear the edit source and return to generation mode
     * Requirements: 7.2
     */
    clearEditSource: () => {
        set({ editSource: null });
    },

    /**
     * Get all gallery items (images and text) sorted by creation date (newest first)
     */
    getAllItems: (): GalleryItem[] => {
        const state = useImageStore.getState();
        const allItems: GalleryItem[] = [...state.images, ...state.textItems];
        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    /**
     * Get paginated gallery items for virtualized rendering
     * Future enhancement: This could query the database directly for true pagination
     */
    getItemsPaginated: async (offset: number, limit: number) => {
        const state = useImageStore.getState();
        const allItems: GalleryItem[] = [...state.images, ...state.textItems];
        const sortedItems = allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return sortedItems.slice(offset, offset + limit);
    },

    /**
     * Get total count of all items
     */
    getTotalItemCount: (): number => {
        const state = useImageStore.getState();
        return state.images.length + state.textItems.length;
    },
}));
