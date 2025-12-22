import { create } from 'zustand';
import type { GeneratedImage, GeneratedText, GalleryItem } from '../types';
import { sqliteService } from '../services/sqliteService';
import { binaryStorageService } from '../services/BinaryStorageService';
import { storageLogger } from '../utils/StorageLogger';

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
    // Cache for loaded image URLs with access tracking
    imageDataCache: Map<string, string>;
    cacheAccessTimes: Map<string, number>; // Track last access time for LRU eviction
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
    clearImageDataCache: () => void; // Clear cache for memory management
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
    cacheAccessTimes: new Map(),

    // Actions

    /**
     * Initialize the store by loading data from SQLite
     */
    initialize: async () => {
        const timer = storageLogger.startOperation('initialize', 'sqlite');

        try {
            set({ isLoading: true });

            await sqliteService.init();

            // Get total count for pagination (only complete images)
            const totalCount = await sqliteService.getCompleteImageMetadataCount();

            const initialBatchSize = 20;
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

            timer.success(undefined, {
                imageCount: imageMetadata.length,
                textItemCount: textItems.length,
                totalCount
            });
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));
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
            // Silently handle load errors
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
            set({ isLoadingMore: false });
        }
    },

    /**
     * Load image data on demand from IndexedDB (with caching)
     * Requirements: 4.2 - On-demand binary loading
     */
    loadImageData: async (id: string): Promise<string | null> => {
        const timer = storageLogger.startOperation('loadImageData', 'indexeddb', { imageId: id });
        const state = useImageStore.getState();

        // Check cache first
        if (state.imageDataCache.has(id)) {
            const cachedData = state.imageDataCache.get(id)!;

            // Update access time for LRU tracking
            set((state) => ({
                cacheAccessTimes: new Map(state.cacheAccessTimes).set(id, Date.now())
            }));

            timer.success(cachedData.length, { cacheHit: true });
            return cachedData;
        }

        try {
            // Load binary data from IndexedDB (not SQLite)
            const imageData = await binaryStorageService.getImageData(id);

            if (imageData) {
                // Manage cache size before adding new entry
                const MAX_CACHE_SIZE = 50; // Limit cache to 50 images
                if (state.imageDataCache.size >= MAX_CACHE_SIZE) {
                    // Remove least recently used item
                    const oldestEntry = Array.from(state.cacheAccessTimes.entries())
                        .sort(([, a], [, b]) => a - b)[0];

                    if (oldestEntry) {
                        const [oldestId] = oldestEntry;

                        set((state) => {
                            const newCache = new Map(state.imageDataCache);
                            const newAccessTimes = new Map(state.cacheAccessTimes);
                            newCache.delete(oldestId);
                            newAccessTimes.delete(oldestId);
                            return {
                                imageDataCache: newCache,
                                cacheAccessTimes: newAccessTimes
                            };
                        });
                    }
                }

                // Cache the loaded URL with access time
                set((state) => ({
                    imageDataCache: new Map(state.imageDataCache).set(id, imageData),
                    cacheAccessTimes: new Map(state.cacheAccessTimes).set(id, Date.now())
                }));

                timer.success(imageData.length, {
                    cacheHit: false,
                    cacheSize: state.imageDataCache.size + 1
                });
                return imageData;
            } else {
                timer.success(0, { found: false });
                return null;
            }
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    },

    /**
     * Clear image data cache for memory management
     */
    clearImageDataCache: () => {
        console.debug('[ImageStore] Clearing image data cache');
        set({
            imageDataCache: new Map(),
            cacheAccessTimes: new Map()
        });
    },

    /**
     * Add a new image to the gallery
     * New images are added at the beginning of the array (newest first)
     * UI update is immediate, database persistence happens asynchronously
     * Coordinates storage between SQLite (metadata) and IndexedDB (binary data)
     * Requirements: 2.1, 3.3, 1.1, 1.2, 5.2
     */
    addImage: async (image: GeneratedImage) => {
        const timer = storageLogger.startOperation('addImage', 'sqlite', { imageId: image.id });

        // Update UI immediately for responsive feel (Requirements: 1.1 - 50ms UI update)
        set((state) => {
            const newState = {
                images: [image, ...state.images],
                totalImageCount: state.totalImageCount + 1,
            };

            return newState;
        });

        // Coordinate storage between SQLite (metadata) and IndexedDB (binary data)
        // Requirements: 5.2 - Route operations to appropriate storage mechanisms
        try {
            // Split the image data for coordinated storage
            const { url, ...metadata } = image;

            // Store metadata in SQLite (without binary data)
            await sqliteService.addImage({
                ...metadata,
                url: undefined, // No binary data in SQLite
                hasBinaryData: Boolean(url),
                binaryDataSize: url ? url.length : 0
            });

            // Store binary data in IndexedDB if present
            if (url) {
                await binaryStorageService.storeImageDataWithQuotaManagement(image.id, url);
            }

            timer.success(url?.length, { hasBinaryData: Boolean(url) });
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));

            // Rollback: Remove from UI state if persistence failed
            // Requirements: 5.2 - Atomic operations with rollback on partial failures
            set((state) => ({
                images: state.images.filter(img => img.id !== image.id),
                totalImageCount: Math.max(0, state.totalImageCount - 1),
            }));

            // Attempt cleanup of any partially stored data
            try {
                await Promise.allSettled([
                    sqliteService.deleteImage(image.id),
                    binaryStorageService.deleteImageData(image.id)
                ]);
            } catch (cleanupError) {
                // Silently handle cleanup errors
            }

            // Re-throw error for caller to handle
            throw new Error(`Failed to store image data: ${error instanceof Error ? error.message : String(error)}`);
        }
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
            // In a production app, you might want to show a toast notification
            // or implement retry logic here
        }
    },

    /**
     * Update an existing image by ID
     * Used to update status, URL, or error information
     * UI update is immediate, database persistence happens asynchronously
     * Coordinates updates between SQLite (metadata) and IndexedDB (binary data)
     * Requirements: 1.4, 1.5, 4.4, 5.2, 5.3
     */
    updateImage: async (id: string, updates: Partial<GeneratedImage>) => {
        // Update UI immediately for responsive feel
        set((state) => ({
            images: state.images.map((img) =>
                img.id === id ? { ...img, ...updates } : img
            ),
        }));

        // Coordinate updates between SQLite (metadata) and IndexedDB (binary data)
        // Requirements: 5.2 - Route operations to appropriate storage mechanisms
        try {
            const { url, ...metadataUpdates } = updates;

            // Update metadata in SQLite (without binary data)
            const sqliteUpdates: any = { ...metadataUpdates };

            // Add binary data tracking fields if URL is being updated
            if ('url' in updates) {
                sqliteUpdates.hasBinaryData = Boolean(url);
                sqliteUpdates.binaryDataSize = url ? url.length : 0;
            }

            // Only call SQLite if there are updates to make
            if (Object.keys(sqliteUpdates).length > 0) {
                await sqliteService.updateImage(id, sqliteUpdates);
            }

            // Update binary data in IndexedDB if URL is being updated
            if ('url' in updates) {
                if (url) {
                    // Store new binary data
                    await binaryStorageService.storeImageDataWithQuotaManagement(id, url);
                } else {
                    // Remove binary data if URL is being set to null/undefined
                    await binaryStorageService.deleteImageData(id);
                }
            }

        } catch (error) {
            // Requirements: 5.3 - Error handling for partial operation failures
            // Note: We don't rollback UI changes for updates as they might be partially valid
            // Instead, we log the error and let the user retry if needed
            throw new Error(`Failed to update image data: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    /**
     * Delete an image from the gallery by ID
     * UI update is immediate, database persistence happens asynchronously
     * Coordinates cleanup between SQLite (metadata) and IndexedDB (binary data)
     * Requirements: 4.2, 4.4, 5.2, 5.3
     */
    deleteImage: async (id: string) => {
        // Update UI immediately for responsive feel
        set((state) => {
            const newCache = new Map(state.imageDataCache);
            const newAccessTimes = new Map(state.cacheAccessTimes);
            newCache.delete(id); // Remove from cache
            newAccessTimes.delete(id); // Remove from access times
            const filteredImages = state.images.filter((img) => img.id !== id);
            const wasDeleted = filteredImages.length < state.images.length;
            return {
                images: filteredImages,
                imageDataCache: newCache,
                cacheAccessTimes: newAccessTimes,
                totalImageCount: wasDeleted ? state.totalImageCount - 1 : state.totalImageCount,
            };
        });

        // Coordinate cleanup between SQLite (metadata) and IndexedDB (binary data)
        // Requirements: 4.4, 5.2 - Ensure cleanup of both storage mechanisms for deletions
        try {
            await Promise.allSettled([
                sqliteService.deleteImage(id),
                binaryStorageService.deleteImageData(id)
            ]);
        } catch (error) {
            // Requirements: 5.3 - Error handling for partial operation failures
            // For deletions, we don't rollback UI changes since the user intended to delete
            // But we should attempt cleanup of any remaining data
            try {
                await Promise.allSettled([
                    sqliteService.deleteImage(id),
                    binaryStorageService.deleteImageData(id)
                ]);
            } catch (retryError) {
                // Silently handle retry errors
            }
        }
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
