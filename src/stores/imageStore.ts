import { create } from 'zustand';
import type { GeneratedImage, GeneratedText, GalleryItem } from '../types';
import { sqliteService } from '../services/sqliteService';

/**
 * Gallery store state interface
 */
interface ImageStoreState {
    // State
    images: GeneratedImage[]; // Metadata only, URLs loaded on demand
    textItems: GeneratedText[];
    isGenerating: boolean;
    isLoading: boolean;
    // Progressive loading state
    hasMoreImages: boolean;
    isLoadingMore: boolean;
    totalImageCount: number;
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
    loadImages: () => Promise<void>;
    loadMoreImages: () => Promise<void>; // Progressive loading
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
 * Image store using Zustand with SQLite persistence
 * Manages the state for generated images
 * UI state (aspect ratio, layout mode, etc.) and edit source moved to separate uiStore for better performance
 * Requirements: 3.1 - Persist images to SQLite database via IndexedDB
 */
export const useImageStore = create<ImageStore>()((set) => ({
    // Initial state
    images: [],
    textItems: [],
    isGenerating: false,
    isLoading: true,
    hasMoreImages: true,
    isLoadingMore: false,
    totalImageCount: 0,
    imageDataCache: new Map(),

    // Actions

    /**
     * Initialize the store by loading data from SQLite
     */
    initialize: async () => {
        try {
            set({ isLoading: true });

            await sqliteService.init();

            // Get total count for pagination (only complete images)
            const totalCount = await sqliteService.getCompleteImageMetadataCount();

            // Load zero images initially for maximum startup performance
            const initialBatchSize = 0;
            const imageMetadata = await sqliteService.getCompleteImageMetadataPaginated(0, initialBatchSize);

            // Load text items from localStorage (temporary solution)
            const textItemsJson = localStorage.getItem('textItems');
            const textItems: GeneratedText[] = textItemsJson ?
                JSON.parse(textItemsJson).map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                })) : [];

            set({
                images: imageMetadata,
                textItems,
                totalImageCount: totalCount,
                hasMoreImages: imageMetadata.length < totalCount,
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
            const totalCount = await sqliteService.getCompleteImageMetadataCount();
            set({
                images: imageMetadata.filter(img => img.status === 'complete'), // Filter to complete only
                totalImageCount: totalCount,
                hasMoreImages: false // All loaded
            });
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    },

    /**
     * Load more image metadata progressively
     */
    loadMoreImages: async () => {
        const state = useImageStore.getState();

        // Don't load if already loading or no more images
        if (state.isLoadingMore || !state.hasMoreImages) {
            return;
        }

        try {
            set({ isLoadingMore: true });

            const currentOffset = state.images.length;
            const batchSize = 10;

            const moreImageMetadata = await sqliteService.getCompleteImageMetadataPaginated(currentOffset, batchSize);

            if (moreImageMetadata.length > 0) {
                set((state) => ({
                    images: [...state.images, ...moreImageMetadata],
                    hasMoreImages: moreImageMetadata.length === batchSize,
                    isLoadingMore: false
                }));
            } else {
                set({
                    hasMoreImages: false,
                    isLoadingMore: false
                });
            }
        } catch (error) {
            console.error('Failed to load more images:', error);
            set({ isLoadingMore: false });
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
            totalImageCount: state.totalImageCount + 1,
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
            const filteredImages = state.images.filter((img) => img.id !== id);
            const wasDeleted = filteredImages.length < state.images.length;
            return {
                images: filteredImages,
                imageDataCache: newCache,
                totalImageCount: wasDeleted ? state.totalImageCount - 1 : state.totalImageCount,
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
