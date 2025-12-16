# Personas Feature

## Overview

The Personas feature allows users to automatically improve their image generation prompts using Amazon Nova 2 Omni before generating images. This feature enhances the quality and detail of generated images by applying different AI personas that provide more descriptive and optimized prompts to the image generation model.

## Feature Components

### 1. Persona Selector

A new selector has been added to the input bar, similar to the aspect ratio selector, with the label "Personas". It provides four options:

- **Off**: Use the user's prompt as-is without any persona
- **Standard**: Professional photographer persona with technical expertise
- **Creative**: Artistic persona that adds creative flair and imagination
- **Custom**: Your own custom persona with unique characteristics

### 2. Persona Flow

When any persona other than "Off" is selected, the following flow occurs:

1. **User submits prompt**: User enters their prompt and clicks generate
2. **Persona enhancement**: The original prompt is sent to Nova 2 Omni with a specialized persona system prompt
3. **Enhanced prompt generation**: Nova 2 Omni returns an improved version of the prompt based on the selected persona
4. **UI update**: The enhanced prompt immediately replaces the original prompt in the placeholder and all UI displays
5. **Image generation**: The enhanced prompt is used for actual image generation
6. **Storage**: The enhanced prompt is saved as the main prompt for the generated image

### 3. Persona Types

#### Standard Persona
- Professional photographer persona with technical expertise
- Adds relevant artistic and technical details
- Includes professional photography terminology
- Enhances lighting, composition, and quality terms
- Preserves original intent and subject

#### Creative Persona
- Artistic persona that adds creative flair and imagination
- Includes creative lighting and atmospheric details
- Enhances with artistic styles and techniques
- Adds cinematic or dramatic elements
- Makes prompts more visually striking

## Implementation Details

### Type Definitions
```typescript
export type PromptEnhancement = 'off' | 'standard' | 'creative' | 'custom';
```

### State Management
- Added `selectedPromptEnhancement` to the image store (represents selected persona)
- Persisted to SQLite database like other user preferences
- Default value is 'off' to maintain backward compatibility

### Service Layer
- Added `enhancePrompt()` method to `BedrockImageService`
- Uses Nova 2 Omni with specialized persona system prompts
- Graceful fallback to original prompt if persona enhancement fails

### UI Components
- `PromptEnhancementSelector`: Main persona selector component with icon-based UI
- Integrated into `PromptInputArea` alongside aspect ratio selector
- Expandable tray showing all persona options with descriptions

### Data Storage
- When a persona is used, the enhanced prompt becomes the main `prompt` field of `GeneratedImage`
- The enhanced prompt is displayed everywhere the prompt is shown (placeholders, image cards, lightbox)
- Original prompt is not preserved - the enhanced version becomes the canonical prompt for the image

## User Experience

### Visual Design
- Consistent with existing aspect ratio selector design
- Icon-based representation for each persona type:
  - Off: X icon
  - Standard: Sparkles icon
  - Creative: Wand icon
  - Custom: Settings icon

### Interaction Flow
1. User selects persona type from dropdown
2. User enters their prompt
3. User clicks generate
4. System shows "generating" status during both persona enhancement and image generation
5. Final image is generated using enhanced prompt
6. Enhanced prompt is available for reference

### Error Handling
- If persona enhancement fails, falls back to original prompt
- No user-visible errors for persona enhancement failures
- Continues with image generation using original prompt

## Benefits

1. **Improved Image Quality**: Persona-enhanced prompts typically produce higher quality, more detailed images
2. **User Learning**: Users can see how their prompts were enhanced and learn better prompting techniques
3. **Consistency**: Standardized persona approaches ensure consistent quality improvements
4. **Flexibility**: Users can choose persona type or disable it entirely
5. **Transparency**: Enhanced prompts replace the original and are visible everywhere in the UI

## Future Enhancements

1. **More Personas**: Add additional pre-defined personas for specific styles or use cases
2. **Persona History**: Show before/after prompt comparisons
3. **Persona Analytics**: Track which personas produce better results
4. **Persona Templates**: Pre-defined persona templates for specific use cases
5. **A/B Testing**: Generate images with both original and persona-enhanced prompts for comparison

## Technical Notes

- Persona enhancement uses the same Nova 2 Omni model as image generation
- Persona enhancement requests are separate API calls before image generation
- Minimal performance impact due to text-only enhancement requests
- Backward compatible - existing functionality unchanged when set to 'off'
- Graceful degradation if persona enhancement service is unavailable