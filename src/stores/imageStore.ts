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
    // Debug state
    loadedImageCount: number; // Counter for debugging
}

/**
 * Gallery store actions interface
 */
interface ImageStoreActions {
    // Actions
    addImage: (image: GeneratedImage) => Promise<void>;
    addPlaceholderImage: (image: GeneratedImage) => void; // UI-only, no database write
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
    // Debug state
    loadedImageCount: 0, // Counter for debugging

    // Actions

    /**
     * Initialize the store by loading data from SQLite
     */
    initialize: async () => {
        const overallTimer = storageLogger.startOperation('initialize', 'sqlite');
        const startTime = performance.now();

        try {
            set({ isLoading: true });

            // Step 1: Initialize SQLite database
            const sqliteInitTimer = storageLogger.startOperation('sqliteInit', 'sqlite');
            await sqliteService.init();
            sqliteInitTimer.success();

            // Step 2: Get total count for pagination
            const countTimer = storageLogger.startOperation('getTotalCount', 'sqlite');
            const totalCount = await sqliteService.getCompleteImageMetadataCount();
            countTimer.success(undefined, { totalCount });

            // Step 3: Load initial batch of image metadata
            const metadataTimer = storageLogger.startOperation('loadInitialMetadata', 'sqlite');
            const initialBatchSize = 6; // Reduced from 20 to prevent cascade loading

            const imageMetadata = await sqliteService.getCompleteImageMetadataPaginated(0, initialBatchSize);

            metadataTimer.success(undefined, {
                recordCount: imageMetadata.length,
                batchSize: initialBatchSize
            });

            // Step 4: Load text items from localStorage
            const textItemsTimer = storageLogger.startOperation('loadTextItems', 'localStorage');
            const textItemsJson = localStorage.getItem('textItems');
            const textItems: GeneratedText[] = textItemsJson ?
                JSON.parse(textItemsJson).map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                })) : [];
            textItemsTimer.success(textItemsJson?.length, { textItemCount: textItems.length });

            // Step 5: Update store state
            const loadedCount = imageMetadata.length;
            const hasMore = imageMetadata.length < totalCount;

            set({
                images: imageMetadata,
                textItems,
                totalImageCount: totalCount,
                hasMoreImages: hasMore,
                loadedImageCount: loadedCount,
                isLoading: false
            });

            const totalDuration = performance.now() - startTime;
            overallTimer.success(undefined, {
                imageCount: imageMetadata.length,
                textItemCount: textItems.length,
                totalCount,
                totalDuration
            });
        } catch (error) {
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

        const overallTimer = storageLogger.startOperation('loadMoreImages', 'sqlite');
        const startTime = performance.now();

        try {
            set({ isLoadingMore: true });

            const currentOffset = state.images.length;
            const batchSize = 10; // Standard batch size

            const queryStart = performance.now();
            const moreImageMetadata = await sqliteService.getCompleteImageMetadataPaginated(currentOffset, batchSize);
            const queryDuration = performance.now() - queryStart;

            if (moreImageMetadata.length > 0) {
                const stateUpdateStart = performance.now();

                set((state) => {
                    const newLoadedCount = state.loadedImageCount + moreImageMetadata.length;
                    const hasMore = moreImageMetadata.length === batchSize;

                    return {
                        images: [...state.images, ...moreImageMetadata],
                        hasMoreImages: hasMore,
                        loadedImageCount: newLoadedCount,
                        isLoadingMore: false
                    };
                });

                const stateUpdateDuration = performance.now() - stateUpdateStart;
                const totalDuration = performance.now() - startTime;
                const newState = useImageStore.getState();

                overallTimer.success(undefined, {
                    loadedCount: moreImageMetadata.length,
                    newTotal: newState.loadedImageCount,
                    hasMore: newState.hasMoreImages,
                    totalDuration,
                    queryDuration,
                    stateUpdateDuration
                });
            } else {
                const totalDuration = performance.now() - startTime;
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
            overallTimer.error(error instanceof Error ? error : new Error(String(error)));
            set({ isLoadingMore: false });
        }
    },

    /**
     * Load image data on demand from IndexedDB
     * Requirements: 4.2 - On-demand binary loading
     */
    loadImageData: async (id: string): Promise<string | null> => {
        // Loading image data
        const overallTimer = storageLogger.startOperation('loadImageData', 'indexeddb', { imageId: id });
        const startTime = performance.now();

        try {
            const imageData = await binaryStorageService.getImageData(id);
            const totalDuration = performance.now() - startTime;

            if (imageData) {
                // Image data retrieved successfully
                overallTimer.success(imageData.length, { totalDuration });
                return imageData;
            } else {
                // No image data found
                overallTimer.success(0, { found: false, totalDuration });
                return null;
            }
        } catch (error) {
            overallTimer.error(error instanceof Error ? error : new Error(String(error)));
            return null;
        }
    },

    /**
     * Add a placeholder image to the UI only (no database write)
     * Used for optimistic UI updates during image generation
     * Database write happens only when generation completes successfully
     */
    addPlaceholderImage: (image: GeneratedImage) => {
        // Update UI immediately for responsive feel (Requirements: 1.1 - 50ms UI update)
        set((state) => {
            const newState = {
                images: [image, ...state.images],
                // Don't increment totalImageCount for placeholders since they're not in database yet
                loadedImageCount: state.loadedImageCount + 1, // Track in UI for debugging
            };

            return newState;
        });
    },

    /**
     * Add a new image to the gallery with database persistence
     * Used only when image generation completes successfully
     * UI update is immediate, database persistence happens asynchronously
     * Coordinates storage between SQLite (metadata) and IndexedDB (binary data)
     * Requirements: 2.1, 3.3, 1.1, 1.2, 5.2
     */
    addImage: async (image: GeneratedImage) => {
        const timer = storageLogger.startOperation('addImage', 'sqlite', { imageId: image.id });

        // Update UI immediately for responsive feel (Requirements: 1.1 - 50ms UI update)
        set((state) => {
            // Check if this image already exists in UI (from placeholder)
            const existingIndex = state.images.findIndex(img => img.id === image.id);

            if (existingIndex !== -1) {
                // Update existing placeholder with complete data
                const newImages = [...state.images];
                newImages[existingIndex] = image;

                return {
                    images: newImages,
                    totalImageCount: state.totalImageCount + 1, // Now count it in database total
                };
            } else {
                // Add new image (shouldn't happen with current flow, but handle gracefully)
                return {
                    images: [image, ...state.images],
                    totalImageCount: state.totalImageCount + 1,
                    loadedImageCount: state.loadedImageCount + 1,
                };
            }
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
                loadedImageCount: Math.max(0, state.loadedImageCount - 1),
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
     * Special handling: When status becomes 'complete', triggers database write for placeholders
     * Requirements: 1.4, 1.5, 4.4, 5.2, 5.3
     */
    updateImage: async (id: string, updates: Partial<GeneratedImage>) => {
        // Get current image state to check if this is a placeholder becoming complete
        const currentState = useImageStore.getState();
        const currentImage = currentState.images.find(img => img.id === id);

        // Check if this update transitions a placeholder to complete status
        const isPlaceholderBecomingComplete = currentImage &&
            currentImage.status !== 'complete' &&
            updates.status === 'complete';

        // Update UI immediately for responsive feel
        // PERFORMANCE FIX: Use immer-style update to minimize re-renders
        set((state) => {
            const imageIndex = state.images.findIndex(img => img.id === id);
            if (imageIndex === -1) return state; // No change if image not found

            const updatedImage = { ...state.images[imageIndex], ...updates };

            // Only create new array if the image actually changed
            if (JSON.stringify(updatedImage) === JSON.stringify(state.images[imageIndex])) {
                return state; // No change needed
            }

            const newImages = [...state.images];
            newImages[imageIndex] = updatedImage;

            return {
                ...state,
                images: newImages
            };
        });

        // Handle placeholder becoming complete - write to database for the first time
        if (isPlaceholderBecomingComplete && currentImage) {
            try {
                // Create complete image object with all data
                const completeImage: GeneratedImage = {
                    ...currentImage,
                    ...updates,
                    status: 'complete' // Ensure status is set
                };

                // Write to database using addImage (this will update the UI state again, but that's OK)
                await useImageStore.getState().addImage(completeImage);
                return; // Exit early since addImage handles the database write
            } catch (error) {
                // If database write fails, revert the status update
                set((state) => {
                    const imageIndex = state.images.findIndex(img => img.id === id);
                    if (imageIndex !== -1) {
                        const newImages = [...state.images];
                        newImages[imageIndex] = { ...newImages[imageIndex], status: 'error', error: 'Failed to save to database' };
                        return { ...state, images: newImages };
                    }
                    return state;
                });
                throw error;
            }
        }

        // For non-completion updates or already-complete images, handle normally
        // Coordinate updates between SQLite (metadata) and IndexedDB (binary data)
        // Requirements: 5.2 - Route operations to appropriate storage mechanisms
        try {
            // Only update database if the image is already complete (has been written to database)
            if (currentImage?.status === 'complete') {
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
            }
            // For placeholder images (status !== 'complete'), skip database operations

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
            const filteredImages = state.images.filter((img) => img.id !== id);
            const wasDeleted = filteredImages.length < state.images.length;
            return {
                images: filteredImages,
                totalImageCount: wasDeleted ? state.totalImageCount - 1 : state.totalImageCount,
                loadedImageCount: wasDeleted ? Math.max(0, state.loadedImageCount - 1) : state.loadedImageCount,
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
