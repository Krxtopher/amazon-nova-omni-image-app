# Prompt Enhancement Feature

## Overview

The Prompt Enhancement feature allows users to automatically improve their image generation prompts using Amazon Nova 2 Omni before generating images. This feature enhances the quality and detail of generated images by providing more descriptive and optimized prompts to the image generation model.

## Feature Components

### 1. Prompt Enhancement Selector

A new selector has been added to the input bar, similar to the aspect ratio selector, with the label "Prompt Enhancement". It provides four options:

- **Off**: Use the user's prompt as-is without any enhancement
- **Standard**: Apply standard prompt improvements (technical details, quality terms)
- **Creative**: Add creative flair and artistic details to the prompt
- **Custom**: Reserved for future custom enhancement settings

### 2. Enhancement Flow

When any option other than "Off" is selected, the following flow occurs:

1. **User submits prompt**: User enters their prompt and clicks generate
2. **Prompt enhancement**: The original prompt is sent to Nova 2 Omni with a specialized system prompt for enhancement
3. **Enhanced prompt generation**: Nova 2 Omni returns an improved version of the prompt
4. **Image generation**: The enhanced prompt is used for actual image generation
5. **Storage**: The enhanced prompt is saved with the generated image

### 3. System Prompts

#### Standard Enhancement
- Focuses on technical and quality improvements
- Adds relevant artistic and technical details
- Includes professional photography terminology
- Enhances lighting, composition, and quality terms
- Preserves original intent and subject

#### Creative Enhancement
- Adds imaginative and artistic elements
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
- Added `selectedPromptEnhancement` to the image store
- Persisted to SQLite database like other user preferences
- Default value is 'off' to maintain backward compatibility

### Service Layer
- Added `enhancePrompt()` method to `BedrockImageService`
- Uses Nova 2 Omni with specialized system prompts
- Graceful fallback to original prompt if enhancement fails

### UI Components
- `PromptEnhancementSelector`: Main selector component with icon-based UI
- Integrated into `PromptInputArea` alongside aspect ratio selector
- Expandable tray showing all enhancement options with descriptions

### Data Storage
- Enhanced prompts are stored in the `enhancedPrompt` field of `GeneratedImage`
- Only stored when enhancement is actually used (not 'off')
- Allows users to see what enhanced prompt was used for each image

## User Experience

### Visual Design
- Consistent with existing aspect ratio selector design
- Icon-based representation for each enhancement type:
  - Off: X icon
  - Standard: Sparkles icon
  - Creative: Wand icon
  - Custom: Settings icon

### Interaction Flow
1. User selects enhancement type from dropdown
2. User enters their prompt
3. User clicks generate
4. System shows "generating" status during both enhancement and image generation
5. Final image is generated using enhanced prompt
6. Enhanced prompt is available for reference

### Error Handling
- If prompt enhancement fails, falls back to original prompt
- No user-visible errors for enhancement failures
- Continues with image generation using original prompt

## Benefits

1. **Improved Image Quality**: Enhanced prompts typically produce higher quality, more detailed images
2. **User Learning**: Users can see how their prompts were enhanced and learn better prompting techniques
3. **Consistency**: Standardized enhancement approaches ensure consistent quality improvements
4. **Flexibility**: Users can choose enhancement level or disable it entirely
5. **Transparency**: Enhanced prompts are saved and visible to users

## Future Enhancements

1. **Custom Enhancement**: Allow users to define their own enhancement rules
2. **Enhancement History**: Show before/after prompt comparisons
3. **Enhancement Analytics**: Track which enhancements produce better results
4. **Prompt Templates**: Pre-defined enhancement templates for specific use cases
5. **A/B Testing**: Generate images with both original and enhanced prompts for comparison

## Technical Notes

- Enhancement uses the same Nova 2 Omni model as image generation
- Enhancement requests are separate API calls before image generation
- Minimal performance impact due to text-only enhancement requests
- Backward compatible - existing functionality unchanged when set to 'off'
- Graceful degradation if enhancement service is unavailable