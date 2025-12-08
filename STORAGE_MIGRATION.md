# Storage Migration: localStorage to SQLite

## Overview

The image store has been migrated from localStorage to SQLite (via sql.js and IndexedDB) to provide significantly more storage capacity for your generated images.

## Why the Change?

- **localStorage limitations**: Browser localStorage is typically limited to 5-10MB, which fills up quickly with base64-encoded images
- **SQLite benefits**: 
  - Much larger storage capacity (hundreds of MB to GB depending on browser)
  - Better performance for large datasets
  - More robust querying capabilities
  - Data stored in IndexedDB for persistence

## What Changed?

### Technical Changes

1. **Storage Backend**: 
   - Old: localStorage with Zustand persist middleware
   - New: SQLite database (sql.js) with IndexedDB persistence

2. **Store Methods**: All store methods are now async:
   ```typescript
   // Before
   addImage(image);
   updateImage(id, updates);
   deleteImage(id);
   setAspectRatio(ratio);
   
   // After
   await addImage(image);
   await updateImage(id, updates);
   await deleteImage(id);
   await setAspectRatio(ratio);
   ```

3. **Initialization**: The store now requires initialization:
   ```typescript
   await useImageStore.getState().initialize();
   ```

### Automatic Migration

The app automatically migrates your existing localStorage data to SQLite on first load:

1. Detects existing localStorage data
2. Shows a migration progress message
3. Transfers all images and settings to SQLite
4. Clears localStorage after successful migration
5. Shows a success notification with the number of migrated images

## Storage Capacity

### Before (localStorage)
- Typical limit: 5-10MB
- Approximate capacity: 5-10 high-quality images

### After (SQLite + IndexedDB)
- Typical limit: 50MB - 1GB+ (browser dependent)
- Approximate capacity: 50-1000+ high-quality images

## Browser Compatibility

SQLite storage works in all modern browsers:
- Chrome/Edge: Up to 60% of available disk space
- Firefox: Up to 50% of available disk space  
- Safari: Up to 1GB

## Data Location

Your data is stored in:
1. **In-memory SQLite database**: Active during app usage
2. **IndexedDB**: Persistent storage between sessions
   - Database name: `ImageGeneratorDB`
   - Object store: `database`

## Clearing Data

To clear all stored images and settings:

```typescript
import { sqliteService } from '@/services/sqliteService';

await sqliteService.clearAll();
```

Or clear from browser DevTools:
1. Open DevTools (F12)
2. Go to Application/Storage tab
3. Find IndexedDB → ImageGeneratorDB
4. Right-click and delete

## Development Notes

### Testing
The SQLite service automatically detects test environments and uses local WASM files instead of CDN:

```typescript
// In tests, uses: node_modules/sql.js/dist/sql-wasm.wasm
// In browser, uses: https://sql.js.org/dist/sql-wasm.wasm
```

### Database Schema

**Images Table:**
```sql
CREATE TABLE images (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    aspectRatio TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    error TEXT
)
```

**Settings Table:**
```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
```

## Troubleshooting

### Migration Failed
If migration fails, your original localStorage data is preserved. Check the browser console for error details.

### Database Not Loading
1. Check browser console for errors
2. Verify IndexedDB is enabled in your browser
3. Try clearing IndexedDB and reloading

### Performance Issues
If you have hundreds of images and notice slowness:
1. The database is loaded into memory on startup
2. Consider implementing pagination or lazy loading
3. Older images could be archived to reduce active dataset

## Future Enhancements

Potential improvements for the storage system:
- Image compression before storage
- Pagination for large galleries
- Export/import functionality
- Cloud sync capabilities
- Automatic cleanup of old images
