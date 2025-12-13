# Color Picker Feature

## Overview
The Color Picker feature allows users to sample colors from any pixel in the image gallery interface using an eyedropper tool.

## Features

### 🎨 Eyedropper Tool
- **Location**: Fixed button in the bottom-left corner of the interface
- **Icon**: Pipette icon when inactive, X icon when active
- **Activation**: Click the eyedropper button to enter color picking mode

### 🖱️ Color Sampling
- **Full-screen capture**: The entire visible gallery area is captured to a hidden canvas
- **Real-time preview**: A small color chip follows your mouse cursor showing the current pixel color
- **Live color values**: Displays both HEX and RGB values in the preview chip
- **Click to select**: Click anywhere to pick that color and exit picker mode

### 🎯 User Experience
- **Disabled interactions**: While active, scrolling and other UI interactions are disabled
- **Crosshair cursor**: Visual indicator that you're in color picking mode
- **Instructions**: Clear on-screen instructions guide the user
- **Escape to cancel**: Press ESC key to exit without selecting a color

### 📋 Color Display
- **Selected color chip**: Shows next to the eyedropper button after selection
- **Color formats**: Displays HEX code and RGB values
- **Copy to clipboard**: Click "Copy" button to copy HEX value to clipboard
- **Persistent**: Selected color remains visible until a new color is picked

## Technical Implementation

### Dependencies
- `html2canvas`: Captures the visible DOM area to canvas
- `lucide-react`: Provides the Pipette and X icons

### Key Components
- **ColorPicker.tsx**: Main component handling all color picking functionality
- **Canvas capture**: Uses `html2canvas` to render the visible area
- **Pixel sampling**: Uses Canvas `getImageData()` API to read pixel colors
- **Event handling**: Mouse tracking and click detection with proper cleanup

### Performance Considerations
- **Device pixel ratio**: Accounts for high-DPI displays
- **Canvas optimization**: Only captures when entering picker mode
- **Memory management**: Proper cleanup of event listeners and canvas references

## Usage

1. Click the eyedropper icon in the bottom-left corner
2. Move your mouse over any area of the screen
3. See the live color preview following your cursor
4. Click to select the color under your cursor
5. The selected color appears as a chip next to the eyedropper
6. Click "Copy" to copy the HEX value to your clipboard

## Keyboard Shortcuts
- **ESC**: Cancel color picking mode without selecting a color

## Browser Compatibility
- Requires modern browsers with Canvas API support
- Clipboard API support for copy functionality
- Works on desktop and mobile devices