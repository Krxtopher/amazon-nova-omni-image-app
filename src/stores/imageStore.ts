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
        const overallTimer = storageLogger.startOperation('initialize', 'sqlite');
        console.log('🚀 [STARTUP] Starting app initialization...');
        const startTime = performance.now();

        try {
            set({ isLoading: true });

            // Step 1: Initialize SQLite database
            console.log('📊 [STARTUP] Initializing SQLite database...');
            const sqliteInitTimer = storageLogger.startOperation('sqliteInit', 'sqlite');
            const sqliteInitStart = performance.now();

            await sqliteService.init();

            const sqliteInitDuration = performance.now() - sqliteInitStart;
            console.log(`✅ [STARTUP] SQLite initialized in ${sqliteInitDuration.toFixed(0)}ms`);
            sqliteInitTimer.success(undefined, { duration: sqliteInitDuration });

            // Step 2: Get total count for pagination
            console.log('🔢 [STARTUP] Getting total image count...');
            const countTimer = storageLogger.startOperation('getTotalCount', 'sqlite');
            const countStart = performance.now();

            const totalCount = await sqliteService.getCompleteImageMetadataCount();

            const countDuration = performance.now() - countStart;
            console.log(`✅ [STARTUP] Found ${totalCount} total images in ${countDuration.toFixed(0)}ms`);
            countTimer.success(undefined, { totalCount, duration: countDuration });

            // Step 3: Load initial batch of image metadata
            console.log('📋 [STARTUP] Loading initial image metadata batch...');
            const metadataTimer = storageLogger.startOperation('loadInitialMetadata', 'sqlite');
            const metadataStart = performance.now();
            const initialBatchSize = 6; // Reduced from 20 to prevent cascade loading

            const imageMetadata = await sqliteService.getCompleteImageMetadataPaginated(0, initialBatchSize);

            const metadataDuration = performance.now() - metadataStart;
            console.log(`✅ [STARTUP] Loaded ${imageMetadata.length} image metadata records in ${metadataDuration.toFixed(0)}ms`);
            metadataTimer.success(undefined, {
                recordCount: imageMetadata.length,
                batchSize: initialBatchSize,
                duration: metadataDuration
            });

            // Step 4: Load text items from localStorage
            console.log('📝 [STARTUP] Loading text items from localStorage...');
            const textItemsTimer = storageLogger.startOperation('loadTextItems', 'localStorage');
            const textItemsStart = performance.now();

            const textItemsJson = localStorage.getItem('textItems');
            const textItems: GeneratedText[] = textItemsJson ?
                JSON.parse(textItemsJson).map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                })) : [];

            const textItemsDuration = performance.now() - textItemsStart;
            console.log(`✅ [STARTUP] Loaded ${textItems.length} text items in ${textItemsDuration.toFixed(0)}ms`);
            textItemsTimer.success(textItemsJson?.length, {
                textItemCount: textItems.length,
                duration: textItemsDuration
            });

            // Step 5: Update store state
            console.log('🔄 [STARTUP] Updating store state...');
            const stateUpdateStart = performance.now();

            set({
                images: imageMetadata,
                textItems,
                totalImageCount: totalCount,
                hasMoreImages: imageMetadata.length < totalCount,
                isLoading: false
            });

            const stateUpdateDuration = performance.now() - stateUpdateStart;
            console.log(`✅ [STARTUP] Store state updated in ${stateUpdateDuration.toFixed(0)}ms`);

            const totalDuration = performance.now() - startTime;
            console.log(`🎉 [STARTUP] App initialization completed in ${totalDuration.toFixed(0)}ms`);
            console.log(`📊 [STARTUP] Breakdown: SQLite(${sqliteInitDuration.toFixed(0)}ms) + Count(${countDuration.toFixed(0)}ms) + Metadata(${metadataDuration.toFixed(0)}ms) + TextItems(${textItemsDuration.toFixed(0)}ms) + StateUpdate(${stateUpdateDuration.toFixed(0)}ms)`);

            overallTimer.success(undefined, {
                imageCount: imageMetadata.length,
                textItemCount: textItems.length,
                totalCount,
                totalDuration,
                breakdown: {
                    sqliteInit: sqliteInitDuration,
                    count: countDuration,
                    metadata: metadataDuration,
                    textItems: textItemsDuration,
                    stateUpdate: stateUpdateDuration
                }
            });
        } catch (error) {
            const totalDuration = performance.now() - startTime;
            console.error(`❌ [STARTUP] App initialization failed after ${totalDuration.toFixed(0)}ms:`, error);
            overallTimer.error(error instanceof Error ? error : new Error(String(error)));
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

        console.log('📄 [PAGINATION] Loading more images...');
        const overallTimer = storageLogger.startOperation('loadMoreImages', 'sqlite');
        const startTime = performance.now();

        try {
            set({ isLoadingMore: true });

            const currentOffset = state.images.length;
            const batchSize = 10;

            console.log(`📄 [PAGINATION] Requesting ${batchSize} images starting from offset ${currentOffset}`);
            const queryStart = performance.now();

            const moreImageMetadata = await sqliteService.getCompleteImageMetadataPaginated(currentOffset, batchSize);

            const queryDuration = performance.now() - queryStart;
            console.log(`✅ [PAGINATION] Retrieved ${moreImageMetadata.length} image metadata records in ${queryDuration.toFixed(0)}ms`);

            if (moreImageMetadata.length > 0) {
                const stateUpdateStart = performance.now();

                set((state) => ({
                    images: [...state.images, ...moreImageMetadata],
                    hasMoreImages: moreImageMetadata.length === batchSize,
                    isLoadingMore: false
                }));

                const stateUpdateDuration = performance.now() - stateUpdateStart;
                const totalDuration = performance.now() - startTime;

                console.log(`✅ [PAGINATION] Added ${moreImageMetadata.length} images to store in ${stateUpdateDuration.toFixed(0)}ms`);
                console.log(`🎉 [PAGINATION] Load more completed in ${totalDuration.toFixed(0)}ms (Query: ${queryDuration.toFixed(0)}ms + StateUpdate: ${stateUpdateDuration.toFixed(0)}ms)`);

                overallTimer.success(undefined, {
                    loadedCount: moreImageMetadata.length,
                    newTotal: state.images.length + moreImageMetadata.length,
                    hasMore: moreImageMetadata.length === batchSize,
                    totalDuration,
                    queryDuration,
                    stateUpdateDuration
                });
            } else {
                const totalDuration = performance.now() - startTime;
                console.log(`ℹ️ [PAGINATION] No more images available (${totalDuration.toFixed(0)}ms)`);

                set({
                    hasMoreImages: false,
                    isLoadingMore: false
                });

                overallTimer.success(undefined, {
                    loadedCount: 0,
                    hasMore: false,
                    totalDuration
                });
            }
        } catch (error) {
            const totalDuration = performance.now() - startTime;
            console.error(`❌ [PAGINATION] Load more failed after ${totalDuration.toFixed(0)}ms:`, error);
            overallTimer.error(error instanceof Error ? error : new Error(String(error)));
            set({ isLoadingMore: false });
        }
    },

    /**
     * Load image data on demand from IndexedDB (with caching)
     * Requirements: 4.2 - On-demand binary loading
     */
    loadImageData: async (id: string): Promise<string | null> => {
        console.log(`🖼️ [IMAGE_LOAD] Loading image data for ${id}...`);
        const overallTimer = storageLogger.startOperation('loadImageData', 'indexeddb', { imageId: id });
        const startTime = performance.now();
        const state = useImageStore.getState();

        // Check cache first
        const cacheCheckStart = performance.now();
        if (state.imageDataCache.has(id)) {
            const cachedData = state.imageDataCache.get(id)!;
            const cacheCheckDuration = performance.now() - cacheCheckStart;

            // Update access time for LRU tracking
            const accessUpdateStart = performance.now();
            set((state) => ({
                cacheAccessTimes: new Map(state.cacheAccessTimes).set(id, Date.now())
            }));
            const accessUpdateDuration = performance.now() - accessUpdateStart;

            const totalDuration = performance.now() - startTime;
            console.log(`✅ [IMAGE_LOAD] Cache hit for ${id} (${cachedData.length} bytes) in ${totalDuration.toFixed(0)}ms (CacheCheck: ${cacheCheckDuration.toFixed(0)}ms + AccessUpdate: ${accessUpdateDuration.toFixed(0)}ms)`);

            overallTimer.success(cachedData.length, {
                cacheHit: true,
                totalDuration,
                cacheCheckDuration,
                accessUpdateDuration
            });
            return cachedData;
        }

        const cacheCheckDuration = performance.now() - cacheCheckStart;
        console.log(`🔍 [IMAGE_LOAD] Cache miss for ${id} (${cacheCheckDuration.toFixed(0)}ms), loading from IndexedDB...`);

        try {
            // Load binary data from IndexedDB (not SQLite)
            const indexedDBStart = performance.now();
            const imageData = await binaryStorageService.getImageData(id);
            const indexedDBDuration = performance.now() - indexedDBStart;

            if (imageData) {
                console.log(`📦 [IMAGE_LOAD] Retrieved ${imageData.length} bytes from IndexedDB in ${indexedDBDuration.toFixed(0)}ms`);

                // Manage cache size before adding new entry
                const cacheManagementStart = performance.now();
                const MAX_CACHE_SIZE = 50; // Limit cache to 50 images
                let evictedId: string | null = null;

                if (state.imageDataCache.size >= MAX_CACHE_SIZE) {
                    // Remove least recently used item
                    const oldestEntry = Array.from(state.cacheAccessTimes.entries())
                        .sort(([, a], [, b]) => a - b)[0];

                    if (oldestEntry) {
                        evictedId = oldestEntry[0];
                        console.log(`🗑️ [IMAGE_LOAD] Evicting ${evictedId} from cache (LRU)`);

                        set((state) => {
                            const newCache = new Map(state.imageDataCache);
                            const newAccessTimes = new Map(state.cacheAccessTimes);
                            newCache.delete(evictedId!);
                            newAccessTimes.delete(evictedId!);
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

                const cacheManagementDuration = performance.now() - cacheManagementStart;
                const totalDuration = performance.now() - startTime;

                console.log(`✅ [IMAGE_LOAD] Cached image ${id} (${Math.round(imageData.length / 1024)}KB) in ${totalDuration.toFixed(0)}ms`);
                // Only show breakdown for slow operations
                if (totalDuration > 50) {
                    console.log(`📊 [IMAGE_LOAD] Breakdown: CacheCheck(${cacheCheckDuration.toFixed(0)}ms) + IndexedDB(${indexedDBDuration.toFixed(0)}ms) + CacheManagement(${cacheManagementDuration.toFixed(0)}ms)`);
                }

                overallTimer.success(imageData.length, {
                    cacheHit: false,
                    cacheSize: state.imageDataCache.size + 1,
                    evictedId,
                    totalDuration,
                    breakdown: {
                        cacheCheck: cacheCheckDuration,
                        indexedDB: indexedDBDuration,
                        cacheManagement: cacheManagementDuration
                    }
                });
                return imageData;
            } else {
                const totalDuration = performance.now() - startTime;
                console.log(`⚠️ [IMAGE_LOAD] No data found for ${id} in ${totalDuration.toFixed(0)}ms`);
                overallTimer.success(0, { found: false, totalDuration });
                return null;
            }
        } catch (error) {
            const totalDuration = performance.now() - startTime;
            console.error(`❌ [IMAGE_LOAD] Failed to load ${id} after ${totalDuration.toFixed(0)}ms:`, error);
            overallTimer.error(error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    },

    /**
     * Clear image data cache for memory management
     */
    clearImageDataCache: () => {
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
