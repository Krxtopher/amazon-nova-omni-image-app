import React, {
    useRef,
    useEffect,
    useState,
    useMemo,
    type HTMLAttributes,
} from 'react';

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

interface SimpleMasonryGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    items: MasonryItem[];
    renderer: MasonryItemRenderer;
    columnWidth?: number;
    gap?: number;
    overscan?: number;
    bufferSize?: number;
}

interface ItemLayout {
    item: MasonryItem;
    displayWidth: number;
    displayHeight: number;
    top: number;
    left: number;
}

/**
 * Simplified virtualized masonry grid that actually works
 */
export function SimpleMasonryGrid({
    items,
    renderer,
    columnWidth = 250,
    gap = 8,
    overscan = 5,
    bufferSize = 200,
    className,
    style,
    ...props
}: SimpleMasonryGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [layout, setLayout] = useState<ItemLayout[]>([]);
    const [containerWidth, setContainerWidth] = useState(0);
    const [totalHeight, setTotalHeight] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    // Calculate layout when items or container width changes
    useEffect(() => {
        if (!containerRef.current || containerWidth === 0 || items.length === 0) return;

        const availableWidth = containerWidth - gap;
        const columnCount = Math.max(1, Math.floor(availableWidth / (columnWidth + gap)));
        const actualColumnWidth = Math.floor((availableWidth - (columnCount - 1) * gap) / columnCount);

        const columnHeights = new Array(columnCount).fill(0);
        const newLayout: ItemLayout[] = [];

        items.forEach((item) => {
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
            });

            // Update column height
            columnHeights[shortestColumnIndex] = top + displayHeight + gap;
        });

        const newTotalHeight = Math.max(...columnHeights);

        setLayout(newLayout);
        setTotalHeight(newTotalHeight);
    }, [items, containerWidth, columnWidth, gap]);

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Handle scroll and viewport size
    useEffect(() => {
        if (!scrollContainerRef.current) return;

        const updateViewport = () => {
            if (scrollContainerRef.current) {
                setScrollTop(scrollContainerRef.current.scrollTop);
                setViewportHeight(scrollContainerRef.current.clientHeight);
            }
        };

        const scrollContainer = scrollContainerRef.current;

        // Listen to scroll events
        scrollContainer.addEventListener('scroll', updateViewport, { passive: true });

        // Listen to resize events to update viewport height
        const resizeObserver = new ResizeObserver(() => {
            updateViewport();
        });
        resizeObserver.observe(scrollContainer);

        // Initial values - use a timeout to ensure the container has been sized
        setTimeout(updateViewport, 0);

        // Also update on window resize
        window.addEventListener('resize', updateViewport);

        return () => {
            scrollContainer.removeEventListener('scroll', updateViewport);
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateViewport);
        };
    }, []);

    // Calculate visible items
    const visibleItems = useMemo(() => {
        if (layout.length === 0) return [];

        // If viewport height is 0 or very small, show more items to ensure something is visible
        const effectiveViewportHeight = viewportHeight > 100 ? viewportHeight : 1000;

        const visibleTop = scrollTop - bufferSize;
        const visibleBottom = scrollTop + effectiveViewportHeight + bufferSize;

        const filtered = layout.filter((itemLayout) => {
            const itemTop = itemLayout.top;
            const itemBottom = itemTop + itemLayout.displayHeight;

            return itemBottom >= visibleTop && itemTop <= visibleBottom;
        });

        // If we have very few visible items and viewport height is small, show more
        if (filtered.length < 10 && viewportHeight < 100) {
            return layout.slice(0, Math.min(20, layout.length));
        }

        return filtered;
    }, [layout, scrollTop, viewportHeight, bufferSize]);

    // Render visible items
    const renderItems = () => {
        return visibleItems.map((itemLayout) => {
            // Simple visibility check - if it's rendered, it's visible
            const isVisible = true;

            return (
                <div
                    key={itemLayout.item.id}
                    style={{
                        position: 'absolute',
                        top: itemLayout.top,
                        left: itemLayout.left,
                        width: itemLayout.displayWidth,
                        height: itemLayout.displayHeight,
                    }}
                >
                    {renderer({
                        item: itemLayout.item,
                        displayWidth: itemLayout.displayWidth,
                        displayHeight: itemLayout.displayHeight,
                        isVisible,
                    })}
                </div>
            );
        });
    };

    return (
        <div
            ref={scrollContainerRef}
            className={`simple-masonry-scroll-container ${className || ''}`}
            style={{
                height: '100%',
                overflow: 'auto',
                ...style,
            }}
            {...props}
        >
            <div
                ref={containerRef}
                className="simple-masonry-container"
                style={{
                    position: 'relative',
                    height: totalHeight,
                    width: '100%',
                }}
            >
                {renderItems()}
            </div>

            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
                <div
                    style={{
                        position: 'fixed',
                        top: 10,
                        right: 10,
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '10px',
                        fontSize: '12px',
                        zIndex: 9999,
                        borderRadius: '4px',
                    }}
                >
                    <div>Total Items: {items.length}</div>
                    <div>Visible Items: {visibleItems.length}</div>
                    <div>Scroll Top: {scrollTop.toFixed(0)}</div>
                    <div>Viewport Height: {viewportHeight}</div>
                    <div>Total Height: {totalHeight.toFixed(0)}</div>
                    <div>Container Width: {containerWidth}</div>
                </div>
            )}
        </div>
    );
}

export default SimpleMasonryGrid;