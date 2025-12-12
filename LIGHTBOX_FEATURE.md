# Lightbox Feature

## Overview

The lightbox feature provides a fullscreen image viewing experience with detailed information and navigation controls. When users click on any image in the gallery, it opens in a dedicated lightbox view that maximizes the image display and shows comprehensive details.

## Features

### URL-Based Navigation
- Each lightbox view has a unique URL: `/image/{imageId}`
- URLs can be bookmarked and shared
- Direct navigation to specific images is supported

### Image Display
- Fullscreen presentation with maximized image size
- Responsive layout that adapts to different screen sizes
- Click outside the image to close the lightbox

### Image Details Sidebar
- **Prompt**: The original text prompt used to generate the image
- **Aspect Ratio**: The image's aspect ratio (e.g., 1:1, 16:9)
- **Dimensions**: Actual pixel dimensions (width × height)
- **Creation Date**: When the image was generated
- **Status**: Current image status
- **Technical Info**: Model information and generation parameters

### Navigation Controls
- **Close Button**: X button in top-left corner
- **Navigation Arrows**: Left/right arrows for browsing between images
- **Image Counter**: Shows current position (e.g., "3 of 12")
- **Keyboard Navigation**:
  - `Escape`: Close lightbox
  - `Left Arrow`: Previous image
  - `Right Arrow`: Next image

### Action Buttons
- **Download**: Downloads both the image file and JSON parameters
- **Copy Prompt**: Copies the generation prompt to clipboard

## Implementation Details

### Components
- `Lightbox.tsx`: Main lightbox component
- Updated `MasonryGridImageRenderer.tsx`: Added click handlers for navigation
- Updated `App.tsx`: Added React Router for URL routing

### Routing
- Uses React Router for URL-based navigation
- Route pattern: `/image/:imageId`
- Maintains gallery state while navigating between images

### User Experience
- Smooth transitions and animations
- Prevents body scroll when lightbox is open
- Responsive design works on all screen sizes
- Accessible keyboard navigation

## Usage

1. **Opening**: Click any image in the gallery
2. **Navigating**: Use arrow keys or navigation buttons
3. **Closing**: Press Escape, click X button, or click outside image
4. **Sharing**: Copy the URL to share specific images
5. **Downloading**: Use the download button for image and metadata

## Technical Notes

- Built with React Router for URL management
- Uses Zustand store for image data access
- Fully tested with comprehensive test suite
- Follows existing design patterns and accessibility standards