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

        // Also check immediately in case the page is short and doesn't require scrolling
        // This handles the case where we have very few images initially
        const checkInitialLoad = () => {
            if (hasMore && !isLoading) {
                const documentHeight = document.documentElement.scrollHeight;
                const windowHeight = window.innerHeight;

                // If the page is shorter than the viewport, load more content
                if (documentHeight <= windowHeight + threshold) {
                    onLoadMore();
                }
            }
        };

        // Check immediately on mount, then again after DOM settles
        checkInitialLoad();
        const initialCheckTimeout = setTimeout(checkInitialLoad, 200);

        return () => {
            window.removeEventListener('scroll', throttledHandleScroll);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (initialCheckTimeout) {
                clearTimeout(initialCheckTimeout);
            }
        };
    }, [handleScroll, hasMore, isLoading, onLoadMore, threshold]);
}