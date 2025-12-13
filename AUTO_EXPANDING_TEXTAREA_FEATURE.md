# Auto-Expanding Textarea Feature

## Overview
The text input field in the prompt input area now automatically expands as the user types or adds line breaks, providing a better user experience for longer prompts.

## Implementation Details

### New Component: AutoExpandingTextarea
- **Location**: `src/components/ui/auto-expanding-textarea.tsx`
- **Purpose**: Replaces the standard textarea with one that automatically adjusts its height based on content

### Key Features
1. **Single Line Start**: Begins as a true single line (~24px height)
2. **Auto-Expansion**: Grows automatically as content increases
3. **Focus-Based Behavior**: 
   - **When focused**: Shows full content with auto-expansion
   - **When not focused**: Collapses to show only first two lines with ellipsis if truncated
4. **Viewport Awareness**: Calculates maximum height based on available viewport space
5. **Responsive**: Adjusts on window resize
6. **Overflow Handling**: Shows scrollbar when content exceeds maximum height
7. **Visual Truncation**: Displays "..." when content is truncated in collapsed state

### Technical Implementation
- Uses `useRef` to directly manipulate textarea height
- Calculates `scrollHeight` to determine required height
- Implements viewport-aware maximum height calculation
- Handles both controlled value changes and direct input events
- Maintains all original textarea functionality and props
- Preserves flex layout properties (flex-1, grow, shrink) by applying them to wrapper div
- Uses visual overlay technique for truncated text display
- Smart className parsing to separate flex classes from styling classes

### Integration
- **Modified Component**: `src/components/PromptInputArea.tsx`
- **Changes**: 
  - Replaced `Textarea` import with `AutoExpandingTextarea`
  - Updated flex layout from `items-center` to `items-start` for consistent button positioning
  - Added top margin adjustments for proper alignment with first line of text
- **Backward Compatibility**: Maintains all existing props and behavior

### User Experience Improvements
- No need to manually resize the input field
- Better visibility of longer prompts when focused
- Clean, compact appearance when not focused (collapses to 2 lines)
- Visual indication of truncated content with ellipsis
- Smooth expansion/collapse animation
- Prevents input field from extending beyond viewport
- Maintains focus and cursor position during expansion
- Reduces visual clutter in the interface
- Send button stays consistently positioned at first-line level for easy access
- Consistent UI layout regardless of text input height

### Browser Compatibility
- Works with all modern browsers
- Gracefully handles viewport changes
- Responsive to window resizing

## Usage
The feature is automatically active in the prompt input area. Users can:
- Type normally and see the field expand when focused
- Use Shift+Enter for manual line breaks
- Click away to see the field collapse to 2 lines with ellipsis if needed
- Click back into the field to see full content and continue editing
- Scroll within the field if content exceeds maximum height when focused
- Resize the browser window and see the field adjust accordingly

## Testing
All existing PromptInputArea tests pass, ensuring backward compatibility and proper functionality.