# Layout Toggle Feature

## Overview
Added a toggle button to the sidebar that allows users to switch between vertical and horizontal masonry grid layouts for the gallery.

## Implementation Details

### 1. Store Integration
- Added `layoutMode: 'vertical' | 'horizontal'` to the image store state
- Added `setLayoutMode` action to persist layout preference to SQLite database
- Default layout mode is 'vertical'

### 2. Custom Icons
- Created `VerticalMasonryIcon` and `HorizontalMasonryIcon` components
- Icons visually represent the different layout patterns
- Located in `src/components/icons/MasonryIcons.tsx`

### 3. Sidebar Toggle Button
- Added layout toggle button to the sidebar navigation
- Button shows current layout icon and switches to opposite mode when clicked
- Button label dynamically updates based on current mode
- Positioned between Gallery and Colors buttons

### 4. Gallery Components Updated
- Updated `SimpleVirtualizedGallery`, `GalleryGrid`, and `VirtualizedGallery`
- Components now conditionally render `VMasonryGrid` or `HMasonryGrid` based on store state
- Seamless switching between layouts without data loss

### 5. Persistence
- Layout preference is saved to SQLite database via `sqliteService.setSetting()`
- Setting is loaded on app initialization
- Persists across browser sessions

## Usage
1. Click the layout toggle button in the sidebar
2. Gallery immediately switches between vertical columns and horizontal rows
3. Preference is automatically saved and restored on next visit

## Files Modified
- `src/stores/imageStore.ts` - Added layout mode state and actions
- `src/components/Sidebar.tsx` - Added toggle button
- `src/components/icons/MasonryIcons.tsx` - New custom icons
- `src/components/SimpleVirtualizedGallery.tsx` - Layout switching logic
- `src/components/GalleryGrid.tsx` - Layout switching logic  
- `src/components/VirtualizedGallery.tsx` - Layout switching logic
- `src/components/Sidebar.test.tsx` - Updated tests
- `src/test/layoutToggle.test.tsx` - New feature tests

## Testing
- All existing tests pass
- New tests verify toggle functionality
- Manual testing confirms smooth layout transitions