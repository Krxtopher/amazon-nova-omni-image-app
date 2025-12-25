import { useEffect } from 'react';

/**
 * Custom hook to prevent body scrolling when modals are open
 * 
 * @param isLocked - Whether to lock body scrolling
 */
export function useBodyScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (isLocked) {
            // Store original overflow value
            const originalOverflow = document.body.style.overflow;

            // Prevent scrolling
            document.body.style.overflow = 'hidden';

            // Cleanup function to restore original overflow
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isLocked]);
}