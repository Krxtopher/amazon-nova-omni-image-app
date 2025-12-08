# Reset Data Button Feature

## Overview

Added a "Reset Data" button to the application header that allows users to completely clear all stored data (images and settings) from the SQLite database.

## Implementation

### New Component
- `src/components/ResetDataButton.tsx` - Self-contained button component with confirmation dialog

### Features

1. **Reset Button**
   - Located in the application header (top-right)
   - Styled with destructive colors to indicate danger
   - Trash icon for visual clarity

2. **Confirmation Dialog**
   - Modal overlay with backdrop blur
   - Clear warning message about permanent deletion
   - Two-button choice: Cancel or Confirm
   - Prevents accidental data loss

3. **Loading State**
   - Disables buttons during reset operation
   - Shows "Resetting..." text with spinner
   - Prevents multiple clicks

4. **User Feedback**
   - Success toast notification when reset completes
   - Error toast notification if reset fails
   - Dialog closes automatically on success

### User Experience

**Normal Flow:**
1. User clicks "Reset Data" button in header
2. Confirmation dialog appears with warning
3. User clicks "Reset All Data" to confirm (or "Cancel" to abort)
4. Loading state shows while clearing data
5. Success notification appears
6. Gallery is now empty

**Error Handling:**
- If reset fails, error notification is shown
- Dialog remains open so user can try again
- Console logs error details for debugging

### Technical Details

**Data Cleared:**
- All images from SQLite database
- All settings (aspect ratio, etc.)
- Store is reinitialized with empty state

**Database Operations:**
```typescript
await sqliteService.clearAll();  // Clears all tables
await initialize();               // Reinitializes store
```

**Accessibility:**
- Proper ARIA labels on buttons
- Dialog has role="dialog"
- Keyboard accessible (ESC to close, Tab navigation)
- Screen reader friendly

### Testing

Tests cover:
- ✅ Button renders correctly
- ✅ Dialog opens on click
- ✅ Dialog closes on cancel
- ✅ Dialog closes on backdrop click
- ✅ Error toast shows on failure
- ✅ Buttons disabled during reset

### UI Location

```
┌─────────────────────────────────────────────────┐
│  🌟 AI Image Generator    [Reset Data] ←        │
│  Powered by Amazon Bedrock Nova 2 Omni          │
└─────────────────────────────────────────────────┘
```

### Code Example

```typescript
import { ResetDataButton } from '@/components';

// In header
<header>
  <div className="flex items-center justify-between">
    <div>
      {/* App title */}
    </div>
    <ResetDataButton />
  </div>
</header>
```

### Styling

- Uses existing ShadCN UI Button component
- Destructive variant for danger indication
- Consistent with app's design system
- Responsive on mobile devices

### Future Enhancements

Potential improvements:
- Export data before reset option
- Selective deletion (e.g., delete only images, keep settings)
- Confirmation via typing "DELETE" or similar
- Undo functionality (temporary backup)
- Statistics before reset (e.g., "You have 42 images")
