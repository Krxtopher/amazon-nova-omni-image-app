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
            console.log(`🔄 [HOOK] useImageData skipping duplicate load for ${imageId}`);
            return;
        }

        console.log(`🎣 [HOOK] useImageData triggered for ${imageId}`);
        const hookStartTime = performance.now();

        console.log(`🔄 [HOOK] useImageData initiating load for ${imageId}...`);

        // Load image data
        let isCancelled = false;

        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Add a small random delay to prevent cascade loading
                const delay = Math.random() * 100; // 0-100ms random delay
                await new Promise(resolve => setTimeout(resolve, delay));

                if (isCancelled) return;

                console.log(`🔄 [HOOK] About to call loadImageDataRef.current for ${imageId}`);
                console.log(`🚨 [DEBUG] NEW CODE IS RUNNING - TIMESTAMP: ${Date.now()} - VERSION: 2.0`);
                const loadStart = performance.now();

                // Add timeout to prevent hanging - MUCH shorter timeout for debugging
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Image loading timeout after 3 seconds - likely IndexedDB issue')), 3000);
                });

                const url = await Promise.race([
                    loadImageDataRef.current(imageId),
                    timeoutPromise
                ]);

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
                    hasLoadedRef.current = true; // Only mark as loaded after successful completion
                }
            } catch (err) {
                if (!isCancelled) {
                    const hookDuration = performance.now() - hookStartTime;
                    const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
                    console.error(`❌ [HOOK] useImageData failed for ${imageId} after ${hookDuration.toFixed(0)}ms:`, errorMessage);

                    // For debugging: Set a placeholder error message
                    setError(errorMessage);
                    setImageUrl(null);
                    setIsLoading(false);
                    hasLoadedRef.current = true; // Mark as loaded even on error to prevent retries
                }
            }
        };

        console.log(`🚀 [HOOK] About to call loadData() for ${imageId}`);
        loadData();

        return () => {
            isCancelled = true;
        };
    }, [imageId]); // Only depend on imageId, not store state

    return { imageUrl, isLoading, error };
}