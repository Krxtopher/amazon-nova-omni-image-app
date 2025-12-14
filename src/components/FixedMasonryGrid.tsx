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

interface FixedMasonryGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
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
 * Fixed masonry grid that works with external scroll containers
 */
export function FixedMasonryGrid({
    items,
    renderer,
    columnWidth = 250,
    gap = 8,
    overscan = 5,
    bufferSize = 200,
    className,
    style,
    ...props
}: FixedMasonryGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const [layout, setLayout] = useState<ItemLayout[]>([]);
    const [containerWidth, setContainerWidth] = useState(0);
    const [totalHeight, setTotalHeight] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    // Find the scroll container (the main element with overflow-y-auto)
    const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Find the scroll container by walking up the DOM
        let element = containerRef.current.parentElement;
        while (element) {
            const styles = window.getComputedStyle(element);
            if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
                setScrollContainer(element);
                break;
            }
            element = element.parentElement;
        }

        // Fallback to window if no scroll container found
        if (!element) {
            setScrollContainer(document.documentElement);
        }
    }, []);

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

    // Handle scroll from external container
    useEffect(() => {
        if (!scrollContainer || !containerRef.current) return;

        const updateViewport = () => {
            if (!scrollContainer || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const scrollerRect = scrollContainer.getBoundingClientRect();

            // Calculate relative scroll position
            const relativeScrollTop = Math.max(0, scrollerRect.top - containerRect.top + scrollContainer.scrollTop);
            const viewportHeight = scrollContainer.clientHeight;

            setScrollTop(relativeScrollTop);
            setViewportHeight(viewportHeight);
        };

        scrollContainer.addEventListener('scroll', updateViewport, { passive: true });

        // Also listen for resize
        const resizeObserver = new ResizeObserver(updateViewport);
        resizeObserver.observe(scrollContainer);

        // Initial update
        setTimeout(updateViewport, 0);

        window.addEventListener('resize', updateViewport);

        return () => {
            scrollContainer.removeEventListener('scroll', updateViewport);
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateViewport);
        };
    }, [scrollContainer]);

    // Calculate visible items
    const visibleItems = useMemo(() => {
        if (layout.length === 0) return [];

        // Always show at least some items initially
        if (viewportHeight === 0) {
            return layout.slice(0, Math.min(20, layout.length));
        }

        const visibleTop = scrollTop - bufferSize;
        const visibleBottom = scrollTop + viewportHeight + bufferSize;

        return layout.filter((itemLayout) => {
            const itemTop = itemLayout.top;
            const itemBottom = itemTop + itemLayout.displayHeight;

            return itemBottom >= visibleTop && itemTop <= visibleBottom;
        });
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
            ref={containerRef}
            className={`fixed-masonry-container ${className || ''}`}
            style={{
                position: 'relative',
                height: totalHeight,
                width: '100%',
                ...style,
            }}
            {...props}
        >
            {renderItems()}

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
                    <div>Scroll Container: {scrollContainer?.tagName || 'None'}</div>
                </div>
            )}
        </div>
    );
}

export default FixedMasonryGrid;