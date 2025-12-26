import useViewportVisibility from "@/hooks/useViewportVisibility";
import {
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
  useMemo,
  memo,
  type HTMLAttributes,
} from "react";

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

interface ItemBounds {
  item: MasonryItem;
  displayWidth: number;
  displayHeight: number;
  top: number;
  left: number;
}

interface VMasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MasonryItem[];
  renderer: MasonryItemRenderer;
  gap?: number;
  mobileBreakpoint?: number;  // width threshold for mobile screens (default: 768px)
  maxColumnWidth?: number;    // max column width for non-mobile screens (default: 340px)
}

interface HMasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MasonryItem[];
  renderer: MasonryItemRenderer;
  maxItemSize?: number;
  gap?: number;
}

function VMasonryGrid({
  items,
  renderer,
  gap = 4,
  mobileBreakpoint = 768,
  maxColumnWidth = 430,
  ...props
}: VMasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemsLayout, setItemsLayout] = useState<ItemBounds[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Function to calculate column count based on container width
  const getColumnCount = useMemo(() => (containerWidth: number): number => {
    // Use 1 column for mobile screens
    if (containerWidth <= mobileBreakpoint) {
      return 1;
    }

    // For larger screens, calculate columns based on maxColumnWidth
    // Formula: (containerWidth - gap) / (maxColumnWidth + gap)
    // Minimum of 1 column
    return Math.max(1, Math.floor((containerWidth - gap) / (maxColumnWidth + gap)) + 1);
  }, [mobileBreakpoint, maxColumnWidth, gap]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    // Initial width calculation
    updateWidth();

    return () => resizeObserver.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!containerWidth) return;

    const columnCount = getColumnCount(containerWidth);
    const itemWidth = Math.floor((containerWidth - (columnCount + 1) * gap) / columnCount);

    // 🚀 PERFORMANCE OPTIMIZATION: Use requestIdleCallback for expensive layout calculations
    const performLayout = () => {
      const newItemsLayout = items.map((item) => {
        const displayWidth = itemWidth;
        const displayHeight = (item.height / item.width) * itemWidth;
        return {
          item,
          displayWidth,
          displayHeight,
          top: 0,
          left: 0
        };
      });

      const columnHeights = Array(columnCount).fill(0);
      newItemsLayout.forEach((itemInfo) => {
        const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
        itemInfo.left = columnIndex * (itemWidth + gap) + gap;
        itemInfo.top = columnHeights[columnIndex] + gap;
        columnHeights[columnIndex] = itemInfo.top + itemInfo.displayHeight;
      });

      // Calculate total container height based on tallest column
      const totalHeight = Math.max(...columnHeights) + gap;
      setContainerHeight(totalHeight);
      setItemsLayout(newItemsLayout);
    };

    // For small numbers of items, calculate immediately
    // For large numbers, defer to avoid blocking the UI
    if (items.length <= 20) {
      performLayout();
    } else {
      // Use requestIdleCallback if available, otherwise setTimeout
      if (window.requestIdleCallback) {
        window.requestIdleCallback(performLayout, { timeout: 100 });
      } else {
        setTimeout(performLayout, 0);
      }
    }
  }, [containerWidth, gap, items, getColumnCount]);

  return (
    <div
      {...props}
      className={"masonry-grid " + (props.className || "")}
      style={{
        position: "relative",
        height: containerHeight > 0 ? `${containerHeight}px` : 'auto',
        ...props.style
      }}
      ref={containerRef}
    >
      {itemsLayout.map((itemLayout) => (
        <MasonryItemContainer
          key={itemLayout.item.id}
          item={itemLayout.item}
          displayWidth={itemLayout.displayWidth}
          displayHeight={itemLayout.displayHeight}
          renderer={renderer}
          left={itemLayout.left}
          top={itemLayout.top}
          gap={0}
        />
      ))}
    </div>
  );
}

function HMasonryGrid({
  items,
  renderer,
  maxItemSize = 250,
  gap = 4,
  ...props
}: HMasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<MasonryItemRendererProps[][]>([]);
  const [forceRerender, setForceRerender] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => setForceRerender(true));
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const rows = new Array<MasonryItemRendererProps[]>();
    let currentRow = new Array<MasonryItemRendererProps>();
    rows.push(currentRow);
    let currentRowWidth = 0;
    items.forEach((item, index) => {
      const displayHeight = maxItemSize;
      const displayWidth = (item.width / item.height) * displayHeight;
      const itemInfo = { item, displayWidth, displayHeight, isVisible: true }; // Will be determined by MasonryItemContainer

      currentRow.push(itemInfo);
      currentRowWidth += displayWidth;

      // Resize items in each row so that the row fits the containerWidth exactly.
      const containerWidthNoGaps =
        containerWidth - gap * (currentRow.length + 1);
      if (currentRowWidth > containerWidthNoGaps) {
        const scale = containerWidthNoGaps / currentRowWidth;
        currentRow.forEach((itemInfo) => {
          itemInfo.displayWidth *= scale;
          itemInfo.displayHeight *= scale;
        });
        // Start a new row if there are more items.
        if (index < items.length - 1) {
          currentRow = [];
          rows.push(currentRow);
          currentRowWidth = 0;
        }
      }
    });

    // Calculate total container height
    let totalHeight = 0;
    rows.forEach((row) => {
      if (row.length > 0) {
        totalHeight += row[0].displayHeight + gap;
      }
    });
    totalHeight += gap; // Add final gap

    setContainerHeight(totalHeight);
    setRows(rows);
    setForceRerender(false);
  }, [containerRef, gap, items, forceRerender, maxItemSize, setRows]);

  function renderGridItems() {
    let rowTop = 0;
    const itemElements = new Array<React.JSX.Element>();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].length === 0) continue;
      const rowHeight = rows[i][0].displayHeight;
      let itemLeft = 0;

      rows[i].forEach((itemInfo: MasonryItemRendererProps) => {
        itemElements.push(
          <MasonryItemContainer
            key={itemInfo.item.id}
            item={itemInfo.item}
            displayWidth={itemInfo.displayWidth}
            displayHeight={itemInfo.displayHeight}
            renderer={renderer}
            left={itemLeft}
            top={rowTop}
            gap={gap}
          />
        );
        itemLeft += itemInfo.displayWidth + gap;
      });
      rowTop += rowHeight + gap;
    }
    return itemElements;
  }

  return (
    <div
      {...props}
      className={"masonry-grid " + (props.className || "")}
      style={{
        position: "relative",
        height: containerHeight > 0 ? `${containerHeight}px` : 'auto',
        ...props.style
      }}
      ref={containerRef}
    >
      {renderGridItems()}
    </div>
  );
}

interface MasonryItemContainerProps extends HTMLAttributes<HTMLDivElement> {
  item: MasonryItem;
  displayWidth: number;
  displayHeight: number;
  renderer: MasonryItemRenderer;
  left: number;
  top: number;
  gap: number;
}

const MasonryItemContainer = memo(function MasonryItemContainer({
  item,
  displayWidth,
  displayHeight,
  renderer,
  left,
  top,
  gap,
  ...props
}: MasonryItemContainerProps) {
  const { elementRef, isVisible: _isVisible } = useViewportVisibility<HTMLDivElement>({
    threshold: 0,
  });

  // TEMPORARY: Disable viewport optimization for debugging
  // Always render images to ensure page has enough height for scroll testing
  const isVisible = true;

  const rendererProps = {
    item,
    displayWidth,
    displayHeight,
    isVisible,
  };

  return (
    <div
      ref={elementRef}
      {...props}
      style={{
        position: "absolute",
        transform: `translate3d(${left}px, ${top}px, 0)`,
        width: displayWidth,
        height: displayHeight,
        margin: gap > 0 ? gap : undefined,
        willChange: "transform",
      }}
    >
      {renderer(rendererProps)}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if position, size, or item changed
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.displayWidth === nextProps.displayWidth &&
    prevProps.displayHeight === nextProps.displayHeight &&
    prevProps.left === nextProps.left &&
    prevProps.top === nextProps.top &&
    prevProps.gap === nextProps.gap &&
    // Deep comparison for item properties that affect rendering
    JSON.stringify(prevProps.item) === JSON.stringify(nextProps.item)
  );
});

export { HMasonryGrid, VMasonryGrid };
