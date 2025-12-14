import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    useMemo,
    type HTMLAttributes,
} from 'react';
import { useVirtualizedPerformance } from '../hooks/useVirtualizedPerformance';

export interface MasonryItem {
    width: number;
    height: number;
    id: string;
}

export interface MasonryItemRendererProps {
    item: MasonryItem;
    displayWidth: number;
    displayHeight: number;
    isVisible: boolean;
}

type MasonryItemRenderer = (props: MasonryItemRendererProps) => React.JSX.Element;

interface VirtualizedMasonryGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    items: MasonryItem[];
    renderer: MasonryItemRenderer;
    columnWidth?: number;
    gap?: number;
    overscan?: number; // Number of items to render outside viewport
    bufferSize?: number; // Additional buffer for smooth scrolling
    enablePerformanceMonitoring?: boolean; // Enable performance tracking
    onPerformanceUpdate?: (metrics: any) => void; // Performance callback
    scrollContainer?: HTMLElement | null; // External scroll container (optional)
}

interface ItemLayout {
    item: MasonryItem;
    displayWidth: number;
    displayHeight: number;
    top: number;
    left: number;
    column: number;
    row: number;
}

interface ViewportInfo {
    scrollTop: number;
    scrollLeft: number;
    containerWidth: number;
    containerHeight: number;
    visibleTop: number;
    visibleBottom: number;
}

/**
 * High-performance virtualized masonry grid with viewport culling
 * 
 * Features:
 * - Virtualized rendering (only renders visible items + overscan)
 * - Efficient layout calculation with memoization
 * - Viewport-based culling
 * - Smooth scrolling with buffer zones
 * - Optimized for large datasets
 */
export function VirtualizedMasonryGrid({
    items,
    renderer,
    columnWidth = 250,
    gap = 8,
    overscan = 5,
    bufferSize = 200,
    enablePerformanceMonitoring = false,
    onPerformanceUpdate,
    scrollContainer,
    className,
    style,
    ...props
}: VirtualizedMasonryGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Performance monitoring
    const { metrics, recordRenderTime, updateItemCounts } = useVirtualizedPerformance({
        enabled: enablePerformanceMonitoring,
    });

    // Layout state
    const [layout, setLayout] = useState<ItemLayout[]>([]);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
    const [totalHeight, setTotalHeight] = useState(0);

    // Viewport state
    const [viewport, setViewport] = useState<ViewportInfo>({
        scrollTop: 0,
        scrollLeft: 0,
        containerWidth: 0,
        containerHeight: 0,
        visibleTop: 0,
        visibleBottom: 0,
    });

    // Memoized column configuration
    const columnConfig = useMemo(() => {
        if (containerDimensions.width === 0) return { columnCount: 1, actualColumnWidth: columnWidth };

        const availableWidth = containerDimensions.width - gap;
        const columnCount = Math.max(1, Math.floor(availableWidth / (columnWidth + gap)));
        const actualColumnWidth = Math.floor((availableWidth - (columnCount - 1) * gap) / columnCount);

        return { columnCount, actualColumnWidth };
    }, [containerDimensions.width, columnWidth, gap]);

    // Memoized layout calculation
    const calculateLayout = useCallback((items: MasonryItem[], columnCount: number, actualColumnWidth: number) => {
        if (items.length === 0 || columnCount === 0) return { layout: [], totalHeight: 0 };

        const columnHeights = new Array(columnCount).fill(0);
        const newLayout: ItemLayout[] = [];

        items.forEach((item, index) => {
            // Find the shortest column
            const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

            // Calculate display dimensions
            const displayWidth = actualColumnWidth;
            const displayHeight = (item.height / item.width) * displayWidth;

            // Position the item
            const left = shortestColumnIndex * (actualColumnWidth + gap);
            const top = columnHeights[shortestColumnIndex];

            newLayout.push({
                item,
                displayWidth,
                displayHeight,
                top,
                left,
                column: shortestColumnIndex,
                row: Math.floor(index / columnCount), // Approximate row for optimization
            });

            // Update column height
            columnHeights[shortestColumnIndex] = top + displayHeight + gap;
        });

        const totalHeight = Math.max(...columnHeights);
        return { layout: newLayout, totalHeight };
    }, [gap]);

    // Update layout when items or dimensions change
    useEffect(() => {
        const { layout: newLayout, totalHeight: newTotalHeight } = calculateLayout(
            items,
            columnConfig.columnCount,
            columnConfig.actualColumnWidth
        );

        setLayout(newLayout);
        setTotalHeight(newTotalHeight);
    }, [items, columnConfig, calculateLayout]);

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                setContainerDimensions({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Handle scroll events with throttling
    useEffect(() => {
        // Use external scroll container if provided, otherwise use internal one
        const activeScrollContainer = scrollContainer || scrollContainerRef.current;
        if (!activeScrollContainer || !containerRef.current) return;

        let ticking = false;

        const updateViewport = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const scroller = scrollContainer || scrollContainerRef.current;
            if (!scroller) return;

            let scrollTop = 0;
            let scrollLeft = 0;
            let viewportHeight = 0;

            if (scrollContainer) {
                // External scroll container - calculate relative position
                const containerRect = container.getBoundingClientRect();
                const scrollerRect = scrollContainer.getBoundingClientRect();

                scrollTop = Math.max(0, scrollerRect.top - containerRect.top + scrollContainer.scrollTop);
                scrollLeft = scrollContainer.scrollLeft;
                viewportHeight = scrollContainer.clientHeight;
            } else {
                // Internal scroll container
                scrollTop = scroller.scrollTop;
                scrollLeft = scroller.scrollLeft;
                viewportHeight = scroller.clientHeight;
            }

            const containerWidth = container.offsetWidth;

            const newViewport = {
                scrollTop,
                scrollLeft,
                containerWidth,
                containerHeight: viewportHeight,
                visibleTop: scrollTop - bufferSize,
                visibleBottom: scrollTop + viewportHeight + bufferSize,
            };

            // Debug logging (remove in production)
            if (process.env.NODE_ENV === 'development') {
                console.log('Viewport update:', {
                    scrollTop,
                    viewportHeight,
                    visibleTop: newViewport.visibleTop,
                    visibleBottom: newViewport.visibleBottom,
                    totalItems: items.length,
                });
            }

            setViewport(newViewport);

            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateViewport);
                ticking = true;
            }
        };

        activeScrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });

        // Initial viewport calculation
        updateViewport();

        return () => {
            activeScrollContainer.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [bufferSize, scrollContainer]);

    // Performance callback effect
    useEffect(() => {
        if (enablePerformanceMonitoring && onPerformanceUpdate) {
            onPerformanceUpdate(metrics);
        }
    }, [metrics, enablePerformanceMonitoring, onPerformanceUpdate]);

    // Memoized visible items calculation
    const visibleItems = useMemo(() => {
        const startTime = performance.now();

        if (layout.length === 0) return [];

        const { visibleTop, visibleBottom } = viewport;
        const visible: Array<{ layout: ItemLayout; index: number }> = [];

        // Simplified approach for debugging - check all items
        const overscanPixels = overscan * 100; // Convert overscan items to pixels

        for (let i = 0; i < layout.length; i++) {
            const itemLayout = layout[i];
            const itemTop = itemLayout.top;
            const itemBottom = itemTop + itemLayout.displayHeight;

            // Check if item intersects with visible area (including overscan buffer)
            const isVisible = itemBottom >= (visibleTop - overscanPixels) &&
                itemTop <= (visibleBottom + overscanPixels);

            if (isVisible) {
                visible.push({ layout: itemLayout, index: i });
            }
        }

        // Record performance metrics
        const endTime = performance.now();
        if (enablePerformanceMonitoring) {
            recordRenderTime(startTime, endTime);
            updateItemCounts(visible.length, items.length);
        }

        return visible;
    }, [layout, viewport, overscan, enablePerformanceMonitoring, recordRenderTime, updateItemCounts, items.length]);

    // Render visible items
    const renderItems = () => {
        return visibleItems.map(({ layout: itemLayout }) => {
            // For now, consider all rendered items as visible to debug the layout issue
            const isInViewport = true; // We'll fix this after layout is working

            return (
                <div
                    key={itemLayout.item.id}
                    style={{
                        position: 'absolute',
                        top: itemLayout.top,
                        left: itemLayout.left,
                        width: itemLayout.displayWidth,
                        height: itemLayout.displayHeight,
                        transform: 'translateZ(0)', // Force GPU acceleration
                        willChange: 'auto',
                    }}
                >
                    {renderer({
                        item: itemLayout.item,
                        displayWidth: itemLayout.displayWidth,
                        displayHeight: itemLayout.displayHeight,
                        isVisible: isInViewport,
                    })}
                </div>
            );
        });
    };

    // If using external scroll container, don't create our own scroll wrapper
    if (scrollContainer) {
        return (
            <div
                ref={containerRef}
                className={`virtualized-masonry-container ${className || ''}`}
                style={{
                    position: 'relative',
                    height: totalHeight,
                    width: '100%',
                    contain: 'layout style paint', // CSS containment for performance
                    ...style,
                }}
                {...props}
            >
                {renderItems()}
            </div>
        );
    }

    // Internal scroll container (original behavior)
    return (
        <div
            ref={scrollContainerRef}
            className={`virtualized-masonry-scroll-container ${className || ''}`}
            style={{
                height: '100%',
                overflow: 'auto',
                ...style,
            }}
            {...props}
        >
            <div
                ref={containerRef}
                className="virtualized-masonry-container"
                style={{
                    position: 'relative',
                    height: totalHeight,
                    width: '100%',
                    contain: 'layout style paint', // CSS containment for performance
                }}
            >
                {renderItems()}
            </div>
        </div>
    );
}

export default VirtualizedMasonryGrid;