# Persona Edit Skip Enhancement Feature

## Overview

This feature implements conditional prompt enhancement skipping when both of these conditions are met:
1. User has a persona selected (not "off")
2. User has selected an edit source image

When both conditions are true, the system skips the prompt enhancement process and instead uses a custom system prompt that incorporates the persona description.

## Implementation Details

### Changes Made

#### 1. Updated `GenerationRequest` Interface
- **File**: `src/types/image.ts`
- **Change**: Added optional `customSystemPrompt?: string` field to the `GenerationRequest` interface

#### 2. Modified `BedrockImageService.generateContent()`
- **File**: `src/services/BedrockImageService.ts`
- **Change**: Updated to use custom system prompt if provided, otherwise falls back to default system prompt
- **Logic**: `const systemPrompt = request.customSystemPrompt || getSystemPrompt(isEditRequest);`

#### 3. Enhanced `PromptInputArea.handleSubmit()`
- **File**: `src/components/PromptInputArea.tsx`
- **Changes**:
  - Added import for `personaService`
  - Implemented conditional logic to detect when to skip enhancement
  - Added persona description retrieval for custom system prompt generation
  - Modified the flow to pass custom system prompt to BedrockImageService

### Custom System Prompt Template

When both conditions are met, the system uses this template:

```
Interpret the user's message as an edit request. The output style should match the style represented by this persona:
${personaDescription}
```

### Logic Flow

1. **Condition Check**: `shouldSkipEnhancement = selectedPromptEnhancement !== 'off' && currentEditSource`

2. **If Skip Conditions Met**:
   - Retrieve persona description using `personaService.getPersona(selectedPromptEnhancement)`
   - Generate custom system prompt with persona description
   - Skip prompt enhancement entirely
   - Use original user prompt directly

3. **If Skip Conditions Not Met**:
   - Follow normal prompt enhancement flow (streaming or non-streaming)
   - Use default system prompts

4. **Final Generation**:
   - Pass custom system prompt (if generated) to `BedrockImageService.generateContent()`
   - Service uses custom prompt or falls back to default based on edit/generation context

### Error Handling

- If persona description retrieval fails, the system logs a warning and falls back to default system prompt
- Maintains backward compatibility - all existing functionality continues to work unchanged

### Benefits

1. **Performance**: Skips unnecessary prompt enhancement when editing with personas
2. **Consistency**: Ensures persona style is applied directly to edit requests
3. **User Experience**: Faster response times for persona-based image editing
4. **Flexibility**: Maintains all existing functionality while adding new conditional behavior

## Testing

The feature has been implemented with:
- TypeScript type safety (no compilation errors)
- Successful build verification
- Backward compatibility maintained
- Error handling for edge cases

## Usage

This feature activates automatically when:
1. User selects any persona except "off"
2. User uploads an image for editing
3. User submits a prompt

The system will automatically skip prompt enhancement and apply the persona style directly to the edit request.