import { useEffect, useRef, useCallback } from 'react';

interface UseViewportAwareLoadingProps {
    containerRef: React.RefObject<HTMLElement | null>;
    hasMore: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
    enabled?: boolean;
    debounceMs?: number;
}

/**
 * Hook that automatically loads more content until the container has enough content
 * to show a scrollbar (content overflows the viewport)
 */
export function useViewportAwareLoading({
    containerRef,
    hasMore,
    isLoading,
    onLoadMore,
    enabled = true,
    debounceMs = 500
}: UseViewportAwareLoadingProps) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCheckingRef = useRef(false);

    const checkIfNeedsMoreContent = useCallback(() => {
        if (!enabled || !containerRef.current || isLoading || !hasMore || isCheckingRef.current) {
            return;
        }

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Check if container content extends beyond the viewport
        const contentHeight = container.scrollHeight;
        const containerTop = containerRect.top;
        const visibleContentHeight = contentHeight - Math.max(0, -containerTop);

        // Load more if visible content doesn't fill the viewport plus some buffer
        const needsMore = visibleContentHeight < viewportHeight * 1.2; // 20% buffer

        if (needsMore) {
            isCheckingRef.current = true;
            onLoadMore();

            // Reset the checking flag after a delay to allow for content to load
            setTimeout(() => {
                isCheckingRef.current = false;
            }, 1000);
        }
    }, [enabled, containerRef, isLoading, hasMore, onLoadMore]);

    const debouncedCheck = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(checkIfNeedsMoreContent, debounceMs);
    }, [checkIfNeedsMoreContent, debounceMs]);

    // Check when images change (new content loaded)
    useEffect(() => {
        if (!enabled) return;

        // Small delay to allow DOM to update after content changes
        const timer = setTimeout(checkIfNeedsMoreContent, 100);
        return () => clearTimeout(timer);
    }, [checkIfNeedsMoreContent, enabled]);

    // Check on window resize
    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('resize', debouncedCheck);
        return () => {
            window.removeEventListener('resize', debouncedCheck);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [debouncedCheck, enabled]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        checkIfNeedsMoreContent: debouncedCheck
    };
}