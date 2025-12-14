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
            if (process.env.NODE_ENV === 'development') {
                console.log('Checking element:', element.tagName, element.className, 'overflowY:', styles.overflowY);
            }
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

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
            const detectedContainer = element || document.documentElement;
            console.log('=== SCROLL CONTAINER DETECTION ===');
            console.log('Scroll container detected:', detectedContainer);
            console.log('Scroll container tag:', detectedContainer.tagName);
            console.log('Scroll container clientHeight:', detectedContainer.clientHeight);
            console.log('Scroll container scrollHeight:', detectedContainer.scrollHeight);
            console.log('Window innerHeight:', window.innerHeight);
            console.log('Is document.documentElement?', detectedContainer === document.documentElement);

            // Check if we found a proper scroll container
            if (element) {
                console.log('Found explicit scroll container:', element.tagName, element.className);
            } else {
                console.log('No explicit scroll container found, using document.documentElement');
            }
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

            // Calculate scroll position - try both scroll container and window
            let currentScrollTop = scrollContainer.scrollTop;

            // If the scroll container isn't scrolling, check if the window is scrolling
            if (currentScrollTop === 0 && scrollContainer !== document.documentElement) {
                currentScrollTop = window.scrollY;
            }

            // Use the actual visible height of the scroll container
            // The main element is expanding with content, so we need to calculate the actual viewport
            let calculatedViewportHeight;
            if (scrollContainer === document.documentElement) {
                calculatedViewportHeight = window.innerHeight;
            } else {
                // For flex containers that expand with content, we need to calculate the constrained height
                // Get the container's position relative to the viewport
                const containerRect = scrollContainer.getBoundingClientRect();
                const availableHeight = window.innerHeight - containerRect.top;
                calculatedViewportHeight = Math.max(0, availableHeight);
            }

            // Debug logging
            if (process.env.NODE_ENV === 'development') {
                console.log('updateViewport called');
                console.log('scrollContainer:', scrollContainer);
                console.log('scrollContainer === document.documentElement:', scrollContainer === document.documentElement);
                console.log('scrollContainer.tagName:', scrollContainer.tagName);
                console.log('scrollContainer.clientHeight (content height):', scrollContainer.clientHeight);
                console.log('scrollContainer.scrollTop:', scrollContainer.scrollTop);
                console.log('window.scrollY:', window.scrollY);
                console.log('currentScrollTop (final):', currentScrollTop);
                console.log('window.innerHeight:', window.innerHeight);
                if (scrollContainer !== document.documentElement) {
                    const containerRect = scrollContainer.getBoundingClientRect();
                    console.log('containerRect.top:', containerRect.top);
                    console.log('availableHeight (window.innerHeight - containerRect.top):', window.innerHeight - containerRect.top);
                }
                console.log('calculatedViewportHeight:', calculatedViewportHeight);
            }

            setScrollTop(currentScrollTop);
            setViewportHeight(calculatedViewportHeight);
        };

        const scrollHandler = () => {
            if (process.env.NODE_ENV === 'development') {
                console.log('SCROLL EVENT DETECTED on:', scrollContainer.tagName, 'scrollTop:', scrollContainer.scrollTop);
            }
            updateViewport();
        };

        scrollContainer.addEventListener('scroll', scrollHandler, { passive: true });

        // Also listen to window scroll as a fallback
        const windowScrollHandler = () => {
            if (process.env.NODE_ENV === 'development') {
                console.log('WINDOW SCROLL EVENT DETECTED, window.scrollY:', window.scrollY);
            }
            updateViewport();
        };
        window.addEventListener('scroll', windowScrollHandler, { passive: true });

        // Also listen for resize
        const resizeObserver = new ResizeObserver(updateViewport);
        resizeObserver.observe(scrollContainer);

        // Initial update - try multiple times to ensure it works
        setTimeout(updateViewport, 0);
        setTimeout(updateViewport, 100);
        setTimeout(updateViewport, 500);

        window.addEventListener('resize', updateViewport);

        return () => {
            scrollContainer.removeEventListener('scroll', scrollHandler);
            window.removeEventListener('scroll', windowScrollHandler);
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

            // Create a more unique key to avoid duplicates
            const uniqueKey = `${itemLayout.item.id}-${itemLayout.top}-${itemLayout.left}`;

            return (
                <div
                    key={uniqueKey}
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
                    <div>Window Height: {window.innerHeight}</div>
                    <div>Doc Client Height: {document.documentElement.clientHeight}</div>
                </div>
            )}
        </div>
    );
}

export default FixedMasonryGrid;