# Delete Images Only Feature

## Overview

Added a new option in the Settings panel that allows users to delete all generated images while preserving their settings and custom personas.

## Implementation

### New Components/Methods

1. **SettingsModal.tsx**
   - Added "Delete Images Only" button alongside the existing "Reset All Data" option
   - Added `handleDeleteImages()` method that calls the new SQLite service method
   - Added confirmation dialog specifically for image deletion
   - Added state management for the new deletion process

2. **sqliteService.ts**
   - Added `deleteAllImages()` method that removes only image data and metadata
   - Preserves all settings and custom personas stored in the settings table

### User Experience

- **Delete Images Only**: Removes all generated images (both regular images and text items) but keeps:
  - User preferences (aspect ratio, selected persona, etc.)
  - Custom personas created by the user
  - Any other application settings

- **Reset All Data**: Maintains the existing behavior of completely clearing everything

### Data Preservation

The following data is preserved when using "Delete Images Only":
- Custom personas (stored in settings table as `customPersonas`)
- Selected prompt enhancement/persona (stored as `selectedPromptEnhancement`)
- Aspect ratio preference (stored as `selectedAspectRatio`)
- Any other application settings stored in the SQLite settings table

### Technical Details

- Images are stored in two SQLite tables: `image_metadata` and `image_data`
- Text items are stored in localStorage as `textItems`
- Settings and personas are stored in the SQLite `settings` table
- The new feature only clears the image-related storage, leaving settings intact

## Usage

1. Open the Settings panel from the sidebar
2. In the "Data Management" section, choose between:
   - **Delete Images**: Removes only images, keeps settings and personas
   - **Reset All**: Removes everything (existing behavior)
3. Confirm the action in the dialog that appears

## Benefits

- Users can clean up their image gallery without losing their carefully configured personas
- Preserves user preferences and customizations
- Provides more granular control over data management
- Maintains the existing "nuclear option" for complete reset when needed