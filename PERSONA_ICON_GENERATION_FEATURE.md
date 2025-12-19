# Persona Icon Generation Feature

## Overview

This feature extends the existing persona name generation functionality to also automatically generate appropriate icons for custom personas. When users create or edit a persona, they can now generate both a creative name and a matching icon simultaneously based on the persona description.

## Key Features

### Automatic Icon Generation
- **Simultaneous Generation**: Icons are generated alongside persona names when clicking the sparkles button
- **AI-Powered Selection**: Uses Amazon Bedrock Nova 2 Lite to intelligently select appropriate Lucide React icons
- **Context-Aware**: Icon selection is based on the persona's artistic style, tools, and characteristics

### Runtime Icon Loading
- **Dynamic Loading**: Icons are loaded at runtime using the `iconLoader` utility
- **No Compilation Required**: Icons don't need to be compiled into the application bundle
- **Fallback Support**: Automatically falls back to the Edit icon if a generated icon name is invalid

### Enhanced User Experience
- **Visual Preview**: Icon preview is shown in the persona creation form
- **Consistent Display**: Custom personas now display their unique icons in both the selector and tray
- **Backward Compatibility**: Existing personas without icons are automatically migrated with a default Edit icon

## Implementation Details

### New Components

#### `src/utils/iconLoader.ts`
- `loadIcon(iconName: string)`: Dynamically loads Lucide React icons by name
- `isValidIconName(iconName: string)`: Validates if an icon name exists
- `getAvailableIconNames()`: Returns all available Lucide icon names

#### Enhanced `BedrockImageService`
- `generatePersonaIcon(personaDescription: string)`: Generates appropriate icon names using AI
- Uses specialized system prompt with curated icon categories
- Lower temperature (0.3) for more consistent icon selection

### Updated Data Structure

#### `CustomPersona` Interface
```typescript
export interface CustomPersona {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    icon: string; // New field: Lucide React icon name
    createdAt: Date;
    updatedAt: Date;
}
```

### Migration Strategy
- Existing personas are automatically migrated to include a default "Edit" icon
- Migration happens transparently when personas are loaded
- No data loss or breaking changes for existing users

## Usage

### For Users
1. **Creating a New Persona**:
   - Enter a persona description
   - Click the sparkles button to generate both name and icon
   - Preview the selected icon in the form
   - Save the persona with the generated icon

2. **Editing Existing Personas**:
   - Edit the persona description
   - Regenerate name and icon if desired
   - Icon updates are saved with the persona

### For Developers
```typescript
// Generate icon for a persona description
const iconName = await bedrockService.generatePersonaIcon("watercolor artist who paints landscapes");

// Load the icon component dynamically
const IconComponent = loadIcon(iconName);

// Use in JSX
<IconComponent className="h-5 w-5" />
```

## Icon Categories

The AI selects from curated categories of Lucide React icons:
- **Art & Design**: Palette, Brush, Pen, Camera, etc.
- **Nature**: Flower, Tree, Sun, Moon, Star, etc.
- **Abstract**: Sparkles, Zap, Flame, Heart, Diamond, etc.
- **Tools**: Wrench, Hammer, Scissors, Ruler, etc.
- **Creative**: Wand2, Magic, Lightbulb, Eye, Crown, etc.
- **And more**: Technology, Music, Animals, Objects, Emotions

## Testing

### Unit Tests
- `src/test/iconLoader.test.ts`: Tests for the icon loading utility
- `src/test/personaNameGeneration.test.ts`: Updated to include icon generation tests

### Test Coverage
- Icon loading and fallback behavior
- Invalid icon name handling
- Icon generation method existence and validation
- Error handling for empty descriptions

## Benefits

1. **Enhanced Visual Identity**: Each persona now has a unique visual representation
2. **Improved UX**: Users can quickly identify personas by their icons
3. **Automated Workflow**: No manual icon selection required
4. **Scalable**: Works with any number of custom personas
5. **Maintainable**: Uses existing Lucide React icon library
6. **Performance**: Icons are loaded on-demand, not bundled

## Future Enhancements

- **Manual Icon Selection**: Allow users to manually choose from available icons
- **Custom Icon Upload**: Support for user-uploaded custom icons
- **Icon Categories**: Group icons by category for easier browsing
- **Icon Search**: Search functionality for finding specific icons