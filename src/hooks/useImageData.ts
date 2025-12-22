import { useState, useEffect } from 'react';
import { useImageStore } from '../stores/imageStore';

/**
 * Hook to load image data on demand
 * Returns the image URL when loaded, null while loading, and handles caching
 */
export function useImageData(imageId: string) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadImageData = useImageStore((state) => state.loadImageData);
    const imageDataCache = useImageStore((state) => state.imageDataCache);

    useEffect(() => {
        // Don't load if no imageId provided
        if (!imageId) {
            setImageUrl(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        // Ensure cache is initialized
        const cache = imageDataCache instanceof Map ? imageDataCache : new Map();

        // Check if already in cache
        if (cache.has && cache.has(imageId)) {
            setImageUrl(cache.get(imageId)!);
            setIsLoading(false);
            return;
        }

        // Load image data
        let isCancelled = false;

        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const url = await loadImageData(imageId);

                if (!isCancelled) {
                    setImageUrl(url);
                    setIsLoading(false);
                }
            } catch (err) {
                if (!isCancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load image');
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isCancelled = true;
        };
    }, [imageId, loadImageData, imageDataCache]);

    return { imageUrl, isLoading, error };
}