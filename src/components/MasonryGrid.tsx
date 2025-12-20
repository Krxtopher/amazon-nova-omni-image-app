import useViewportVisibility from "@/hooks/useViewportVisibility";
import {
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
  useMemo,
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
  breakpoints?: {
    sm?: number;  // width threshold for small screens (default: 640px)
    md?: number;  // width threshold for medium screens (default: 768px)
    lg?: number;  // width threshold for large screens (default: 1024px)
  };
  columns?: {
    xs?: number;  // columns for extra small screens (default: 1)
    sm?: number;  // columns for small screens (default: 2)
    md?: number;  // columns for medium screens (default: 3)
    lg?: number;  // columns for large screens (default: 4)
  };
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
  breakpoints,
  columns,
  ...props
}: VMasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemsLayout, setItemsLayout] = useState<ItemBounds[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);

  // Memoize breakpoints and columns to prevent infinite loops
  const stableBreakpoints = useMemo(() =>
    breakpoints || { sm: 480, md: 768, lg: 1600 },
    [breakpoints]
  );

  const stableColumns = useMemo(() =>
    columns || { xs: 1, sm: 2, md: 3, lg: 4 },
    [columns]
  );

  // Function to determine column count based on container width
  const getColumnCount = useMemo(() => (width: number): number => {
    if (width >= (stableBreakpoints.lg || 1024)) return stableColumns.lg || 4;
    if (width >= (stableBreakpoints.md || 768)) return stableColumns.md || 3;
    if (width >= (stableBreakpoints.sm || 640)) return stableColumns.sm || 2;
    return stableColumns.xs || 1;
  }, [stableBreakpoints, stableColumns]);

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
      style={{ position: "relative", ...props.style }}
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
      const itemInfo = { item, displayWidth, displayHeight, isVisible: false };

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
      style={{ position: "relative", ...props.style }}
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

function MasonryItemContainer({
  item,
  displayWidth,
  displayHeight,
  renderer,
  left,
  top,
  gap,
  ...props
}: MasonryItemContainerProps) {
  const { elementRef, isVisible } = useViewportVisibility<HTMLDivElement>({
    threshold: 0,
  });

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
        top,
        left,
        width: displayWidth,
        height: displayHeight,
        margin: gap > 0 ? gap : undefined,
      }}
    >
      {renderer(rendererProps)}
    </div>
  );
}

export { HMasonryGrid, VMasonryGrid };
