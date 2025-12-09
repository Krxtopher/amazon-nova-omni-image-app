# Optimistic UI for Image Generation

## Overview
Implemented optimistic UI updates for the gallery grid. When a user submits a request, a placeholder is immediately added to the gallery before the API call completes. This provides instant visual feedback and improves perceived performance.

## Changes Made

### 1. PromptInputArea Component (`src/components/PromptInputArea.tsx`)
- **Optimistic placeholder creation**: Placeholder is now created immediately when the user submits, before the API call
- **Automatic cleanup**: Placeholder is automatically removed if:
  - An error occurs during generation
  - The model responds with text instead of an image
- **Placeholder update**: If the model successfully returns an image, the placeholder is updated with the actual image data

### 2. Test Updates (`src/components/PromptInputArea.test.tsx`)
Updated all tests to reflect the new optimistic UI behavior:
- Added `deleteImage` mock to store
- Updated test expectations to verify placeholder is created immediately
- Added tests to verify placeholder removal on error
- Added tests to verify placeholder removal on text response
- All 8 tests passing ✓

## User Experience Improvements

### Before
1. User submits prompt
2. Loading indicator appears
3. API call completes
4. Image appears in gallery

### After
1. User submits prompt
2. **Placeholder immediately appears in gallery with loading spinner**
3. Loading indicator appears
4. API call completes
5. Placeholder updates to show actual image (or is removed on error/text response)

## Technical Details

### Flow
```
User submits → Create placeholder → Add to gallery → API call
                                                    ↓
                                    Success (image) → Update placeholder
                                    Success (text)  → Remove placeholder + show modal
                                    Error           → Remove placeholder + show error
```

### Placeholder Structure
```typescript
{
  id: 'placeholder-{timestamp}-{random}',
  url: '',  // Empty for placeholder
  prompt: userPrompt,
  status: 'generating',  // Shows loading spinner in ImageCard
  aspectRatio: selectedAspectRatio,
  width: dimensions.width,
  height: dimensions.height,
  createdAt: new Date()
}
```

## Benefits
- **Instant feedback**: Users see immediate response to their action
- **Better perceived performance**: Gallery feels more responsive
- **Clear loading state**: Loading spinner in placeholder shows generation in progress
- **Automatic cleanup**: No orphaned placeholders on errors or text responses
- **Supports concurrent requests**: Multiple placeholders can exist simultaneously
