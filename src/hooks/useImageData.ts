import { useState, useEffect, useRef } from 'react';
import { useImageStore } from '../stores/imageStore';

/**
 * Hook to load image data on demand
 * Returns the image URL when loaded, null while loading, and handles caching
 */
export function useImageData(imageId: string | null) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use refs to avoid subscribing to store changes that cause re-renders
    const loadImageDataRef = useRef(useImageStore.getState().loadImageData);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        // Update ref to latest function
        loadImageDataRef.current = useImageStore.getState().loadImageData;
    });

    useEffect(() => {
        // Don't load if no imageId provided
        if (!imageId) {
            setImageUrl(null);
            setIsLoading(false);
            setError(null);
            hasLoadedRef.current = false;
            return;
        }

        // Prevent duplicate loads for the same imageId
        if (hasLoadedRef.current) {
            return;
        }

        console.log(`🎣 [HOOK] useImageData triggered for ${imageId}`);
        const hookStartTime = performance.now();

        // Check cache directly from store state (one-time check)
        const currentState = useImageStore.getState();
        const cache = currentState.imageDataCache instanceof Map ? currentState.imageDataCache : new Map();

        // Check if already in cache
        if (cache.has && cache.has(imageId)) {
            const cachedUrl = cache.get(imageId)!;
            const hookDuration = performance.now() - hookStartTime;
            // Reduce logging verbosity for cache hits
            if (hookDuration > 5) { // Only log if it takes more than 5ms
                console.log(`✅ [HOOK] useImageData cache hit for ${imageId} (${Math.round(cachedUrl.length / 1024)}KB) in ${hookDuration.toFixed(0)}ms`);
            }

            setImageUrl(cachedUrl);
            setIsLoading(false);
            hasLoadedRef.current = true;
            return;
        }

        console.log(`🔄 [HOOK] useImageData cache miss for ${imageId}, initiating load...`);

        // Load image data
        let isCancelled = false;
        hasLoadedRef.current = true;

        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Add a small random delay to prevent cascade loading
                const delay = Math.random() * 100; // 0-100ms random delay
                await new Promise(resolve => setTimeout(resolve, delay));

                if (isCancelled) return;

                const loadStart = performance.now();
                const url = await loadImageDataRef.current(imageId);
                const loadDuration = performance.now() - loadStart;

                if (!isCancelled) {
                    const hookDuration = performance.now() - hookStartTime;

                    if (url) {
                        console.log(`✅ [HOOK] useImageData loaded ${imageId} (${url.length} bytes) in ${hookDuration.toFixed(0)}ms (Load: ${loadDuration.toFixed(0)}ms)`);
                    } else {
                        console.log(`⚠️ [HOOK] useImageData found no data for ${imageId} in ${hookDuration.toFixed(0)}ms`);
                    }

                    setImageUrl(url);
                    setIsLoading(false);
                }
            } catch (err) {
                if (!isCancelled) {
                    const hookDuration = performance.now() - hookStartTime;
                    const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
                    console.error(`❌ [HOOK] useImageData failed for ${imageId} after ${hookDuration.toFixed(0)}ms:`, errorMessage);

                    setError(errorMessage);
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isCancelled = true;
        };
    }, [imageId]); // Only depend on imageId, not store state

    return { imageUrl, isLoading, error };
}