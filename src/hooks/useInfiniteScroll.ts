import { useEffect, useCallback } from 'react';

interface UseInfiniteScrollOptions {
    hasMore: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
    threshold?: number; // Distance from bottom in pixels to trigger loading
}

/**
 * Hook to handle infinite scroll behavior
 * Triggers onLoadMore when user scrolls near the bottom of the page
 */
export function useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore,
    threshold = 1000
}: UseInfiniteScrollOptions) {
    const handleScroll = useCallback(() => {
        // Don't trigger if already loading or no more items
        if (isLoading || !hasMore) {
            return;
        }

        // Calculate if user is near bottom
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        const distanceFromBottom = documentHeight - (scrollTop + windowHeight);

        if (distanceFromBottom < threshold) {
            onLoadMore();
        }
    }, [hasMore, isLoading, onLoadMore, threshold]);

    useEffect(() => {
        // Throttle scroll events for better performance
        let timeoutId: NodeJS.Timeout;

        const throttledHandleScroll = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(handleScroll, 100);
        };

        window.addEventListener('scroll', throttledHandleScroll, { passive: true });

        // REMOVED: Automatic initial load check that was causing cascade loading
        // The checkInitialLoad function was automatically triggering loadMore
        // when the page was shorter than viewport, causing unwanted behavior.
        // Now infinite scroll only triggers on actual user scroll events.

        return () => {
            window.removeEventListener('scroll', throttledHandleScroll);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [handleScroll]);
}