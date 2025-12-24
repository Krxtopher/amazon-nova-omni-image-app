import { useEffect, useRef, useState } from 'react';

interface UseDynamicLineClampOptions {
    lineHeight: number; // in pixels
    minLines?: number;
    maxLines?: number;
    padding?: number; // extra padding to account for margins/spacing
}

/**
 * Hook that dynamically calculates the optimal line clamp based on container height
 */
export function useDynamicLineClamp({
    lineHeight,
    minLines = 1,
    maxLines = 10,
    padding = 0
}: UseDynamicLineClampOptions) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lineClamp, setLineClamp] = useState(maxLines);

    useEffect(() => {
        const updateLineClamp = () => {
            if (!containerRef.current) return;

            const containerHeight = containerRef.current.clientHeight;
            const availableHeight = containerHeight - padding;

            // Be more conservative with line height calculation to prevent clipping
            const effectiveLineHeight = lineHeight * 1.1; // Add 10% buffer for line spacing
            const calculatedLines = Math.floor(availableHeight / effectiveLineHeight);

            // Clamp between min and max
            const optimalLines = Math.max(minLines, Math.min(maxLines, calculatedLines));
            setLineClamp(optimalLines);
        };

        // Initial calculation
        updateLineClamp();

        // Create ResizeObserver to watch for container size changes
        const resizeObserver = new ResizeObserver(updateLineClamp);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [lineHeight, minLines, maxLines, padding]);

    return { containerRef, lineClamp };
}