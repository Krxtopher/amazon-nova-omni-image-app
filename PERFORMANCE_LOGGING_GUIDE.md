# Performance Logging Guide

This guide explains how to use the enhanced logging system to analyze app startup performance and identify bottlenecks.

## Overview

The app now has comprehensive logging for all data loading operations during startup and runtime. The logging system tracks:

- **SQLite operations**: Database initialization, metadata queries
- **IndexedDB operations**: Binary image data storage and retrieval
- **localStorage operations**: Text items and settings
- **Cache operations**: In-memory image data caching

## Console Output

When you start the app, you'll see detailed console logs like:

```
🚀 [STARTUP] Starting app initialization...
📊 [STARTUP] Initializing SQLite database...
✅ [STARTUP] SQLite initialized in 45ms
🔢 [STARTUP] Getting total image count...
✅ [STARTUP] Found 150 total images in 12ms
📋 [STARTUP] Loading initial image metadata batch...
✅ [STARTUP] Loaded 20 image metadata records in 8ms
🎉 [STARTUP] App initialization completed in 127ms
```

## Browser Console Analysis

The logging system provides several analysis tools accessible from the browser console:

### 1. Startup Performance Analysis

```javascript
// Analyze startup performance and get recommendations
window.storageLogger.analyzeStartupPerformance();
```

This will show:
- Breakdown by storage type (SQLite, IndexedDB, localStorage)
- Individual operation timings
- Total startup time
- Potential bottlenecks (operations >100ms)
- Performance recommendations

### 2. Storage Status

```javascript
// Show current storage health and recent operations
window.storageLogger.showStorageStatus();
```

### 3. Performance Statistics

```javascript
// Get overall performance stats
const stats = window.storageLogger.getPerformanceStats();
console.log(stats);
```

### 4. Recent Operations

```javascript
// View recent operations (last 50 by default)
const recent = window.storageLogger.getRecentOperations(50);
console.log(recent);
```

### 5. Failed Operations

```javascript
// View only failed operations for troubleshooting
const failed = window.storageLogger.getFailedOperations();
console.log(failed);
```

## Understanding the Logs

### Startup Flow

1. **App Component**: Overall app initialization timing
2. **SQLite Init**: Database initialization and schema setup
3. **Metadata Loading**: Loading image metadata (without binary data)
4. **Progressive Loading**: Loading more images as user scrolls
5. **Image Data Loading**: On-demand loading of binary image data

### Log Prefixes

- `🚀 [STARTUP]`: App initialization
- `🗄️ [SQLITE]`: SQLite database operations
- `🗃️ [INDEXEDDB]`: IndexedDB binary storage operations
- `📄 [PAGINATION]`: Progressive loading of more images
- `🖼️ [IMAGE_LOAD]`: Individual image data loading
- `🎣 [HOOK]`: React hook operations
- `📊 [ANALYSIS]`: Performance analysis

### Performance Indicators

- **Green checkmarks (✅)**: Successful operations
- **Red X marks (❌)**: Failed operations
- **Warning signs (⚠️)**: Potential issues or missing data
- **Slow operations (🐌)**: Operations taking >100ms

## Troubleshooting Common Issues

### Slow Startup (>1000ms total)

**Possible causes:**
- Large SQLite database file
- Many images in initial batch
- Slow IndexedDB initialization

**Solutions:**
- Reduce initial batch size
- Implement lazy loading
- Consider database optimization

### High IndexedDB Times

**Possible causes:**
- Large binary image data being loaded during startup
- IndexedDB fragmentation

**Solutions:**
- Ensure binary data is only loaded on-demand
- Clear browser storage and restart
- Check if images are being preloaded unnecessarily

### SQLite Bottlenecks

**Possible causes:**
- Large database file
- Complex queries
- Database corruption

**Solutions:**
- Check database size in DevTools > Application > IndexedDB
- Consider pagination optimization
- Reset database if corrupted

## Monitoring in Production

The logging system automatically:
- Logs slow operations (>1000ms) even in production
- Maintains a rolling history of 1000 operations
- Provides error tracking for failed operations

To enable debug mode in production:
```javascript
localStorage.setItem('storage-debug', 'true');
// Refresh the page
```

To disable debug mode:
```javascript
localStorage.removeItem('storage-debug');
// Refresh the page
```

## Performance Targets

- **Total startup time**: <500ms (good), <1000ms (acceptable)
- **SQLite operations**: <100ms each
- **IndexedDB operations**: <50ms for metadata, <200ms for binary data
- **Individual image loading**: <100ms from cache, <300ms from storage

## Data Collection

The logging system tracks:
- Operation duration (ms)
- Data size (bytes)
- Success/failure status
- Error messages
- Metadata (record counts, cache hits, etc.)
- Timestamps for trend analysis

This data helps identify performance regressions and optimize the user experience.