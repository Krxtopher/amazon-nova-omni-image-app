# Persona Name Generation Feature

## Overview

Added a magical name generation feature to the PersonaTray component that allows users to automatically generate creative 1-2 word persona names based on their persona descriptions using Amazon Bedrock's Nova 2 Omni model.

## Features

### AI-Powered Name Generation
- **Sparkle Icon Button**: Added a purple sparkle icon (✨) next to the name input field
- **Smart Generation**: Uses the persona description to generate contextually relevant names
- **Creative Output**: Generates unique, catchy 1-2 word names that capture the essence of the persona
- **Visual Feedback**: Button shows a pulsing animation while generating

### User Experience
- **Easy Access**: Icon button positioned to the right of the name input field
- **Contextual**: Only enabled when a persona description is entered
- **Error Handling**: Graceful error handling with user-friendly messages
- **Non-Intrusive**: Optional feature that doesn't interfere with manual name entry

## Implementation Details

### BedrockImageService Enhancement
Added `generatePersonaName()` method that:
- Takes a persona description as input
- Uses a specialized system prompt for creative naming
- Employs higher temperature (1.2) for more creative outputs
- Returns clean, trimmed persona names

### PersonaTray Component Updates
- Added `isGeneratingName` state for loading indication
- Added `handleGenerateName()` function for API interaction
- Enhanced name input field with inline sparkle button
- Integrated error handling into existing error state management

### System Prompt Design
The name generation uses a carefully crafted system prompt that:
- Emphasizes 1-2 word maximum length
- Encourages creative, evocative language
- Provides examples of good persona names
- Maintains focus on the persona's essence

## Usage

1. **Enter Persona Description**: User types a description of their persona's style and characteristics
2. **Click Sparkle Icon**: The ✨ button becomes enabled and clickable
3. **AI Generation**: Nova 2 Omni generates a creative name based on the description
4. **Name Population**: The generated name automatically fills the name input field
5. **Manual Override**: Users can still edit or replace the generated name

## Example Generations

- **Input**: "A mystical artist who creates ethereal landscapes with cosmic themes"
- **Output**: "Cosmic Dreamer"

- **Input**: "A dark fantasy photographer specializing in shadow and light contrasts"
- **Output**: "Shadow Weaver"

- **Input**: "A vibrant pop art creator with bold colors and playful themes"
- **Output**: "Neon Muse"

## Technical Benefits

- **Seamless Integration**: Uses existing BedrockImageService infrastructure
- **Consistent UX**: Follows established patterns in the PersonaTray component
- **Error Resilience**: Handles API failures gracefully without breaking the form
- **Performance**: Lightweight feature with minimal impact on bundle size

## Future Enhancements

- **Multiple Suggestions**: Could generate multiple name options for user selection
- **Style Preferences**: Could incorporate user style preferences into generation
- **Name History**: Could remember previously generated names for reuse
- **Batch Generation**: Could generate names for multiple personas at once