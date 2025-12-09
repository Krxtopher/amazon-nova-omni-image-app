# Text Response Handling Feature

## Overview

This feature handles cases where the AI model generates text content instead of image content. When this occurs, the text is displayed to the user in a modal dialog that must be dismissed before continuing.

## Implementation Details

### Components Modified

1. **TextResponseModal** (`src/components/TextResponseModal.tsx`)
   - New modal component for displaying text responses
   - Uses shadcn/ui Dialog component
   - Displays the text content with proper formatting (whitespace-pre-wrap)
   - User must dismiss the modal to continue

2. **PromptInputArea** (`src/components/PromptInputArea.tsx`)
   - Added state management for text response modal
   - Updated to handle `GenerationResponse` discriminated union type
   - Shows modal when response type is 'text'
   - Only creates placeholder images when response type is 'image'

3. **BedrockImageService** (`src/services/BedrockImageService.ts`)
   - Renamed `generateImage` to `generateContent` to reflect dual return types
   - Updated `parseConverseResponse` to return `GenerationResponse` type
   - Returns `{ type: 'image', imageDataUrl: string }` for image responses
   - Returns `{ type: 'text', text: string }` for text responses

4. **Type Definitions** (`src/types/image.ts`)
   - Added `GenerationResponse` discriminated union type
   - Supports both image and text response types

## User Experience

When the AI model returns text instead of an image:

1. The generation request is sent to the service
2. The service detects the text response
3. A modal appears with the text content (no placeholder image is created)
4. User reads the text and dismisses the modal
5. User can then try again with a different prompt

This is treated as a valid response type, not an error, so no error state is shown in the gallery.

## Technical Flow

```
User submits prompt
  ↓
BedrockImageService.generateContent() called
  ↓
API returns response
  ↓
parseConverseResponse() checks content type
  ↓
Returns GenerationResponse:
  - { type: 'image', imageDataUrl: string } for images
  - { type: 'text', text: string } for text
  ↓
PromptInputArea handles response based on type
  ↓
If response.type === 'text':
  - Show TextResponseModal with text content
  - Clear edit source if present
  - No placeholder image is created
  - No error state is shown
  ↓
If response.type === 'image':
  - Create placeholder image
  - Update with generated image URL
  - Show success notification
  ↓
User dismisses modal (for text) or views image (for image)
```

## API Design

The `generateContent` method now returns a discriminated union type:

```typescript
type GenerationResponse =
    | { type: 'image'; imageDataUrl: string }
    | { type: 'text'; text: string };
```

This design provides:
- **Type safety**: TypeScript can narrow the type based on the `type` field
- **Clarity**: The return type explicitly shows both possible outcomes
- **No exceptions for valid responses**: Text responses are not treated as errors
- **Easy to extend**: Additional response types can be added in the future

## Testing

A test suite has been created for the TextResponseModal component:
- `src/components/TextResponseModal.test.tsx`

Tests cover:
- Rendering when open
- Not rendering when closed
- Calling onClose callback
- Displaying multi-line content

## Future Enhancements

Possible improvements:
- Add copy-to-clipboard button for text content
- Add option to save text responses
- Provide suggestions for how to modify prompt to get images
- Track frequency of text responses for analytics
