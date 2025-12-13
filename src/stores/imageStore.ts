import { create } from 'zustand';
import type { GeneratedImage, GeneratedText, GalleryItem, EditSource, AspectRatio } from '../types';
import { sqliteService } from '../services/sqliteService';

/**
 * Gallery store state interface
 */
interface ImageStoreState {
    // State
    images: GeneratedImage[];
    textItems: GeneratedText[];
    selectedAspectRatio: AspectRatio;
    editSource: EditSource | null;
    isGenerating: boolean;
    isLoading: boolean;
}

/**
 * Gallery store actions interface
 */
interface ImageStoreActions {
    // Actions
    addImage: (image: GeneratedImage) => Promise<void>;
    addTextItem: (textItem: GeneratedText) => Promise<void>;
    updateImage: (id: string, updates: Partial<GeneratedImage>) => Promise<void>;
    deleteImage: (id: string) => Promise<void>;
    deleteTextItem: (id: string) => Promise<void>;
    setAspectRatio: (ratio: AspectRatio) => Promise<void>;
    setEditSource: (source: EditSource | null) => void;
    clearEditSource: () => void;
    loadImages: () => Promise<void>;
    getAllItems: () => GalleryItem[];
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
 * Image store using Zustand with SQLite persistence
 * Manages the state for generated images, aspect ratio selection, and edit source
 * Requirements: 3.1 - Persist images to SQLite database via IndexedDB
 */
export const useImageStore = create<ImageStore>()((set) => ({
    // Initial state
    images: [],
    textItems: [],
    selectedAspectRatio: DEFAULT_ASPECT_RATIO,
    editSource: null,
    isGenerating: false,
    isLoading: true,

    // Actions

    /**
     * Initialize the store by loading data from SQLite
     */
    initialize: async () => {
        try {
            set({ isLoading: true });
            await sqliteService.init();

            // Load images
            const images = await sqliteService.getAllImages();

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

            set({
                images,
                textItems,
                selectedAspectRatio: aspectRatio,
                isLoading: false
            });
        } catch (error) {
            console.error('Failed to initialize store:', error);
            set({ isLoading: false });
        }
    },

    /**
     * Load images from the database
     */
    loadImages: async () => {
        try {
            const images = await sqliteService.getAllImages();
            set({ images });
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    },

    /**
     * Add a new image to the gallery
     * New images are added at the beginning of the array (newest first)
     * Requirements: 2.1, 3.3
     */
    addImage: async (image: GeneratedImage) => {
        try {
            await sqliteService.addImage(image);
            set((state) => ({
                images: [image, ...state.images],
            }));
        } catch (error) {
            console.error('Failed to add image:', error);
            throw error;
        }
    },

    /**
     * Add a new text item to the gallery
     * New text items are added at the beginning of the array (newest first)
     */
    addTextItem: async (textItem: GeneratedText) => {
        try {
            // For now, we'll store text items in localStorage since SQLite service doesn't support them yet
            // In a production app, you'd extend the SQLite service to handle text items
            const existingTextItems = JSON.parse(localStorage.getItem('textItems') || '[]');
            const updatedTextItems = [textItem, ...existingTextItems];
            localStorage.setItem('textItems', JSON.stringify(updatedTextItems));

            set((state) => ({
                textItems: [textItem, ...state.textItems],
            }));
        } catch (error) {
            console.error('Failed to add text item:', error);
            throw error;
        }
    },

    /**
     * Update an existing image by ID
     * Used to update status, URL, or error information
     * Requirements: 1.4, 1.5
     */
    updateImage: async (id: string, updates: Partial<GeneratedImage>) => {
        try {
            await sqliteService.updateImage(id, updates);
            set((state) => ({
                images: state.images.map((img) =>
                    img.id === id ? { ...img, ...updates } : img
                ),
            }));
        } catch (error) {
            console.error('Failed to update image:', error);
            throw error;
        }
    },

    /**
     * Delete an image from the gallery by ID
     * Requirements: 4.2
     */
    deleteImage: async (id: string) => {
        try {
            await sqliteService.deleteImage(id);
            set((state) => ({
                images: state.images.filter((img) => img.id !== id),
            }));
        } catch (error) {
            console.error('Failed to delete image:', error);
            throw error;
        }
    },

    /**
     * Delete a text item from the gallery by ID
     */
    deleteTextItem: async (id: string) => {
        try {
            // Remove from localStorage
            const existingTextItems = JSON.parse(localStorage.getItem('textItems') || '[]');
            const updatedTextItems = existingTextItems.filter((item: GeneratedText) => item.id !== id);
            localStorage.setItem('textItems', JSON.stringify(updatedTextItems));

            set((state) => ({
                textItems: state.textItems.filter((item) => item.id !== id),
            }));
        } catch (error) {
            console.error('Failed to delete text item:', error);
            throw error;
        }
    },

    /**
     * Set the selected aspect ratio for new image generation
     * Requirements: 2.1, 2.5
     */
    setAspectRatio: async (ratio: AspectRatio) => {
        try {
            await sqliteService.setSetting('selectedAspectRatio', ratio);
            set({ selectedAspectRatio: ratio });
        } catch (error) {
            console.error('Failed to set aspect ratio:', error);
            throw error;
        }
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
    getAllItems: () => {
        const state = useImageStore.getState();
        const allItems: GalleryItem[] = [...state.images, ...state.textItems];
        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
}));
