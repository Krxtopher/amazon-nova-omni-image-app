# Lazy Loading Migration

## Overview

This document describes the migration from the original image storage schema to the new lazy loading schema that separates image metadata from image data for better memory efficiency.

## What Changed

### Before (Original Schema)
- Single `images` table containing all image data including the full base64 URL
- All image data loaded into memory at startup
- Higher memory usage, especially with many large images

### After (New Lazy Loading Schema)
- `image_metadata` table: Contains image properties (id, prompt, status, dimensions, etc.) - loaded immediately
- `image_data` table: Contains only image URLs - loaded on demand when images become visible
- Significantly reduced memory usage and faster initial load times

## Migration Process

The migration happens automatically when the app starts:

1. **Detection**: Check if old `images` table exists
2. **Migration**: If found, copy data to new tables:
   - Metadata goes to `image_metadata` table
   - URLs go to `image_data` table
3. **Cleanup**: Drop the old `images` table
4. **Logging**: Console logs show migration progress

## Benefits

- **Memory Efficiency**: Only lightweight metadata loaded initially
- **Performance**: Images load on-demand when they come into view
- **Caching**: Once loaded, image URLs are cached to prevent re-fetching
- **Backward Compatibility**: Existing images are automatically migrated

## User Experience

- Existing images will be preserved and available after the migration
- No user action required - migration happens transparently
- Gallery loads faster initially
- Images appear as they scroll into view

## Technical Details

### Migration Code Location
- `src/services/sqliteService.ts` - `runMigrations()` method

### Test Coverage
- `src/test/migration.test.ts` - Verifies migration works correctly
- `src/test/lazyLoading.test.ts` - Tests lazy loading functionality

### Key Components
- `useImageData` hook - Handles on-demand image loading
- `MasonryGridImageRenderer` - Uses lazy loading for gallery images
- `Lightbox` - Uses lazy loading for full-size image display