# Gallery Animation Fix

## Problem
When a new image placeholder was added to the gallery grid, all existing images would retrigger their fade-in animation. This created a jarring visual effect where images that had already loaded and displayed would suddenly fade out and fade back in again.

## Root Cause Analysis

The issue was caused by unstable React keys in the `FixedMasonryGrid` component. The original key generation logic was:

```typescript
const uniqueKey = `${itemLayout.item.id}-${itemLayout.top}-${itemLayout.left}`;
```

When a new image was added to the gallery:
1. The masonry layout algorithm recalculated positions for all items
2. Existing images got new `top` and `left` positions due to the layout shift
3. This caused their React keys to change (e.g., `image-1-0-0` → `image-1-50-100`)
4. React treated components with different keys as completely new instances
5. Old components were unmounted and new ones mounted, losing all internal state
6. The fade-in animation state (`hasFadedInRef`) was reset, causing animations to retrigger

## Solution

### 1. Stable React Keys
Changed the key generation to use only the item ID:

```typescript
// Before (unstable)
const uniqueKey = `${itemLayout.item.id}-${itemLayout.top}-${itemLayout.left}`;

// After (stable)
const uniqueKey = itemLayout.item.id;
```

This ensures that existing components maintain their identity across layout changes.

### 2. Animation State Tracking
Enhanced the fade-in animation logic in `MasonryImageRenderer` to track whether an image has already faded in:

```typescript
const hasFadedInRef = useRef(false);

useEffect(() => {
    if (item.status === 'complete' && displayUrl && !isLoadingImage && !hasFadedInRef.current) {
        setShouldFadeIn(false);
        if (isVisible) {
            const timer = setTimeout(() => {
                setShouldFadeIn(true);
                hasFadedInRef.current = true; // Mark as faded in
            }, 200);
            return () => clearTimeout(timer);
        }
    }
}, [displayUrl, isVisible, item.status, isLoadingImage]);
```

The `hasFadedInRef` prevents the animation from retriggering even if the component's props change.

## Files Modified

1. **`src/components/FixedMasonryGrid.tsx`**
   - Changed React key generation to use only item ID
   - Ensures component identity is preserved across position changes

2. **`src/components/MasonryGridImageRenderer.tsx`**
   - Added `useRef` import
   - Added `hasFadedInRef` to track animation state
   - Updated fade-in logic to respect the tracking state
   - Updated `onLoad` handler to check tracking state

3. **`src/test/setup.ts`**
   - Added ResizeObserver mock for test environment

4. **`src/test/galleryAnimationFix.test.tsx`**
   - Added tests to verify the fix behavior
   - Documents the importance of stable React keys

## Testing

The fix includes comprehensive tests that verify:
- React keys are stable and based only on item ID
- Component identity is preserved across layout changes
- Animation state tracking prevents retriggering

## Impact

- ✅ Existing images no longer retrigger fade-in animations when new items are added
- ✅ Gallery feels more stable and professional
- ✅ Performance improved (no unnecessary component remounting)
- ✅ User experience enhanced (no jarring visual effects)

## Technical Notes

This fix demonstrates the importance of stable React keys in dynamic layouts. When components can change position but maintain the same logical identity, using position data in keys causes unnecessary remounting and state loss.

The solution follows React best practices:
- Use stable, unique identifiers as keys
- Preserve component state across renders
- Minimize unnecessary component lifecycle events