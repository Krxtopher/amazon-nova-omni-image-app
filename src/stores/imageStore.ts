import { create } from 'zustand';
import type { GeneratedImage, GeneratedText, GalleryItem, AspectRatio } from '../types';
import { amplifyStorageService } from '../services/AmplifyStorageService';
import { amplifyDataService } from '../services/AmplifyDataService';
import { storageLogger } from '../utils/StorageLogger';
import { ASPECT_RATIO_DIMENSIONS } from '../services/BedrockImageService';

/**
 * Resolve width/height from an aspect ratio string using the known dimension mapping.
 * Falls back to 1024x1024 if the ratio is unknown.
 */
function getDimensionsForAspectRatio(aspectRatio: string): { width: number; height: number } {
    const key = aspectRatio as Exclude<AspectRatio, 'random'>;
    return ASPECT_RATIO_DIMENSIONS[key] ?? { width: 1024, height: 1024 };
}

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
 * Image store using Zustand with Amplify Data Service persistence
 * Manages the state for generated images
 * UI state (aspect ratio, layout mode, etc.) and edit source moved to separate uiStore for better performance
 * Requirements: 3.1 - Persist image metadata to Amplify Data Service (DynamoDB)
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
     * Initialize the store by loading data from Amplify Data Service
     */
    initialize: async () => {
        const overallTimer = storageLogger.startOperation('initialize', 'amplify-data');
        const startTime = performance.now();

        try {
            set({ isLoading: true });

            // Step 1: Load image metadata from Amplify Data Service
            const metadataTimer = storageLogger.startOperation('loadImageMetadata', 'amplify-data');
            const imageMetadata = await amplifyDataService.listImageMetadata();
            metadataTimer.success(undefined, {
                recordCount: imageMetadata.length
            });

            // Step 2: Convert Amplify metadata to GeneratedImage format
            const images: GeneratedImage[] = imageMetadata.map(metadata => {
                const ratio = metadata.aspectRatio || '1:1';
                const fallback = getDimensionsForAspectRatio(ratio);
                return {
                    id: metadata.id,
                    url: '', // URLs will be loaded on demand
                    prompt: metadata.prompt,
                    enhancedPrompt: metadata.enhancedPrompt || undefined,
                    aspectRatio: ratio as any,
                    width: metadata.width || fallback.width,
                    height: metadata.height || fallback.height,
                    status: 'complete' as const,
                    createdAt: new Date(metadata.createdAt),
                    s3Key: metadata.s3Key, // Store S3 key for later retrieval
                };
            });

            // Step 3: Load text items from localStorage (unchanged)
            const textItemsTimer = storageLogger.startOperation('loadTextItems', 'localStorage');
            const textItemsJson = localStorage.getItem('textItems');
            const textItems: GeneratedText[] = textItemsJson ?
                JSON.parse(textItemsJson).map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                })) : [];
            textItemsTimer.success(textItemsJson?.length, { textItemCount: textItems.length });

            // Step 4: Update store state
            const totalCount = images.length;
            const loadedCount = images.length;

            set({
                images: images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), // Sort by newest first
                textItems,
                totalImageCount: totalCount,
                hasMoreImages: false, // All loaded from Amplify Data
                loadedImageCount: loadedCount,
                isLoading: false
            });

            const totalDuration = performance.now() - startTime;
            overallTimer.success(undefined, {
                imageCount: images.length,
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
     * Load image metadata from Amplify Data Service
     */
    loadImages: async () => {
        try {
            const imageMetadata = await amplifyDataService.listImageMetadata();

            // Convert to GeneratedImage format
            const images: GeneratedImage[] = imageMetadata.map(metadata => {
                const ratio = metadata.aspectRatio || '1:1';
                const fallback = getDimensionsForAspectRatio(ratio);
                return {
                    id: metadata.id,
                    url: '', // URLs will be loaded on demand
                    prompt: metadata.prompt,
                    enhancedPrompt: metadata.enhancedPrompt || undefined,
                    aspectRatio: ratio as any,
                    width: metadata.width || fallback.width,
                    height: metadata.height || fallback.height,
                    status: 'complete' as const,
                    createdAt: new Date(metadata.createdAt),
                    s3Key: metadata.s3Key,
                };
            });

            set({
                images: images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
                totalImageCount: images.length,
                hasMoreImages: false // All loaded from Amplify Data
            });
        } catch (error) {
            // Silently handle load errors
        }
    },

    /**
     * Load more image metadata progressively
     * Note: With Amplify Data Service, we load all images at once, so this is mainly for compatibility
     */
    loadMoreImages: async () => {
        const state = useImageStore.getState();

        // Don't load if already loading or no more images
        if (state.isLoadingMore || !state.hasMoreImages) {
            return;
        }

        // Since we load all images from Amplify Data at once, just mark as no more images
        set({
            hasMoreImages: false,
            isLoadingMore: false
        });
    },

    /**
     * Load image data on demand from Amplify S3 storage
     * Returns a secure, time-limited URL for the image
     * Requirements: 4.2 - On-demand secure URL generation, 4.3 - Time-limited access
     */
    loadImageData: async (id: string): Promise<string | null> => {
        const overallTimer = storageLogger.startOperation('loadImageData', 's3', { imageId: id });
        const startTime = performance.now();

        try {
            // Get image metadata to find S3 key
            const currentState = useImageStore.getState();
            const image = currentState.images.find(img => img.id === id);

            if (!image || !image.s3Key) {
                // No S3 key found for this image
                overallTimer.success(0, { found: false, totalDuration: performance.now() - startTime });
                return null;
            }

            // Generate secure URL from S3
            const secureUrl = await amplifyStorageService.getSecureImageUrl(image.s3Key, 60); // 60 minute expiration
            const totalDuration = performance.now() - startTime;

            overallTimer.success(secureUrl.length, { totalDuration, s3Key: image.s3Key });
            return secureUrl;
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
     * Add a new image to the gallery with database persistence.
     * The Lambda is responsible for writing images to S3 — this function
     * only creates the DynamoDB metadata record pointing at the s3Key.
     * Requirements: 2.1, 3.3, 1.1, 3.1
     */
    addImage: async (image: GeneratedImage) => {
        const timer = storageLogger.startOperation('addImage', 'amplify-data', { imageId: image.id });

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
                    totalImageCount: state.totalImageCount + 1,
                };
            } else {
                return {
                    images: [image, ...state.images],
                    totalImageCount: state.totalImageCount + 1,
                    loadedImageCount: state.loadedImageCount + 1,
                };
            }
        });

        try {
            // Create metadata record in DynamoDB. The s3Key was set by the Lambda.
            await amplifyDataService.createImageMetadata({
                prompt: image.prompt,
                enhancedPrompt: image.enhancedPrompt || undefined,
                aspectRatio: image.aspectRatio,
                width: image.width || undefined,
                height: image.height || undefined,
                s3Key: image.s3Key || '',
                s3Url: undefined, // Generated on demand via getSecureImageUrl
            });

            timer.success(undefined, { s3Key: image.s3Key });
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));

            // Rollback UI state if metadata creation failed
            set((state) => ({
                images: state.images.filter(img => img.id !== image.id),
                totalImageCount: Math.max(0, state.totalImageCount - 1),
                loadedImageCount: Math.max(0, state.loadedImageCount - 1),
            }));

            throw new Error(`Failed to store image metadata: ${error instanceof Error ? error.message : String(error)}`);
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
     * Coordinates updates between Amplify Data (metadata) and S3 (image files)
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

        // For non-completion updates or already-complete images, update metadata only.
        // S3 writes are handled exclusively by the Lambda.
        try {
            if (currentImage?.status === 'complete') {
                const amplifyUpdates: any = {};

                if (updates.prompt !== undefined) amplifyUpdates.prompt = updates.prompt;
                if (updates.enhancedPrompt !== undefined) amplifyUpdates.enhancedPrompt = updates.enhancedPrompt;
                if (updates.aspectRatio !== undefined) amplifyUpdates.aspectRatio = updates.aspectRatio;
                if (updates.width !== undefined) amplifyUpdates.width = updates.width;
                if (updates.height !== undefined) amplifyUpdates.height = updates.height;
                if (updates.s3Key !== undefined) amplifyUpdates.s3Key = updates.s3Key;

                if (Object.keys(amplifyUpdates).length > 0) {
                    await amplifyDataService.updateImageMetadata({
                        id: currentImage.id,
                        ...amplifyUpdates
                    });
                }
            }
        } catch (error) {
            throw new Error(`Failed to update image data: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    /**
     * Delete an image from the gallery by ID
     * UI update is immediate, database persistence happens asynchronously
     * Coordinates cleanup between Amplify Data (metadata) and S3 (image files)
     * Requirements: 4.2, 4.4, 5.2, 5.3, 3.4
     */
    deleteImage: async (id: string) => {
        // Get current image to find S3 key before deletion
        const currentState = useImageStore.getState();
        const imageToDelete = currentState.images.find(img => img.id === id);

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

        // Coordinate cleanup between Amplify Data (metadata) and S3 (image files)
        // Requirements: 4.4, 5.2, 3.4 - Ensure cleanup of both storage mechanisms for deletions
        try {
            const cleanupPromises = [];

            // Delete metadata from Amplify Data Service if the image was persisted
            if (imageToDelete?.status === 'complete') {
                cleanupPromises.push(amplifyDataService.deleteImageMetadata(imageToDelete.id));
            }

            // Add S3 deletion if there's an S3 key
            if (imageToDelete?.s3Key) {
                cleanupPromises.push(amplifyStorageService.deleteImage(imageToDelete.s3Key));
            }

            await Promise.allSettled(cleanupPromises);
        } catch (error) {
            // Requirements: 5.3 - Error handling for partial operation failures
            // For deletions, we don't rollback UI changes since the user intended to delete
            // But we should attempt cleanup of any remaining data
            try {
                const retryPromises = [];

                if (imageToDelete?.status === 'complete') {
                    retryPromises.push(amplifyDataService.deleteImageMetadata(imageToDelete.id));
                }

                if (imageToDelete?.s3Key) {
                    retryPromises.push(amplifyStorageService.deleteImage(imageToDelete.s3Key));
                }

                await Promise.allSettled(retryPromises);
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
