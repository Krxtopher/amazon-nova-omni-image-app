# Implementation Plan

- [x] 1. Initialize project and setup development environment
  - Create Vite + React + TypeScript project
  - Install and configure ShadCN UI with Tailwind CSS
  - Install AWS SDK for Bedrock Runtime
  - Install Zustand for state management
  - Setup testing frameworks (Vitest, React Testing Library, fast-check)
  - Configure TypeScript with strict mode
  - Setup project structure (components, services, stores, types, utils)
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [x] 2. Define core types and interfaces
  - Create TypeScript interfaces for GeneratedImage, EditSource, AspectRatio types
  - Define BedrockImageRequest and response types
  - Create GenerationRequest interface
  - Define ImageStatus and error types
  - _Requirements: 9.1, 9.4_

- [-] 3. Implement Bedrock service layer
  - [x] 3.1 Create BedrockImageService class with AWS SDK client initialization
    - Setup BedrockRuntimeClient with credentials configuration
    - Implement constructor with region and credentials parameters
    - Set model ID to 'us.amazon.nova-2-omni-v1:0' for Nova 2 Omni
    - _Requirements: 10.1, 10.3_

  - [x] 3.2 Implement aspect ratio to dimensions conversion utility
    - Create ASPECT_RATIO_DIMENSIONS mapping for display purposes
    - Implement getDimensionsForAspectRatio method
    - Note: Nova 2 Omni handles aspect ratios internally via prompt
    - _Requirements: 2.2, 2.3_

  - [ ]* 3.3 Write property test for aspect ratio dimensions
    - **Property 5: Aspect ratio selection affects generation requests**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 3.4 Implement image encoding utilities
    - Create encodeImageToBytes method for File/Blob inputs
    - Convert images to Uint8Array for Converse API
    - Handle both uploaded files and gallery image URLs
    - Add error handling for encoding failures
    - _Requirements: 6.2, 10.2_

  - [x] 3.5 Implement generateImage method using Converse API
    - Build Converse API message with text prompt
    - Include optional input image for editing scenarios
    - Call ConverseCommand with Nova 2 Omni model ID
    - Parse response and extract generated image
    - Handle API errors and network failures
    - _Requirements: 1.1, 10.1, 10.4_

  - [ ]* 3.6 Write property test for API request format
    - **Property 21: API request format correctness**
    - **Validates: Requirements 10.1, 10.2**

  - [x] 3.7 Implement response parsing utility
    - Create parseConverseResponse method
    - Extract image bytes from response.output.message.content
    - Convert Uint8Array to Base64 data URL
    - Handle malformed responses
    - _Requirements: 10.4_

  - [ ]* 3.8 Write property test for response parsing
    - **Property 22: API response parsing**
    - **Validates: Requirements 10.4**

  - [x] 3.9 Implement error handling and categorization
    - Create ErrorHandler utility
    - Categorize errors (validation, API, network, client)
    - Generate user-friendly error messages
    - Determine if errors are retryable
    - _Requirements: 1.5, 10.5_

  - [ ]* 3.10 Write property test for error handling
    - **Property 23: API error handling**
    - **Validates: Requirements 10.5**

- [ ] 4. Implement state management with Zustand
  - [x] 4.1 Create ImageStore with state and actions
    - Define store interface with images array, selectedAspectRatio, editSource, isGenerating
    - Implement addImage action
    - Implement updateImage action
    - Implement deleteImage action
    - Implement setAspectRatio action
    - Implement setEditSource and clearEditSource actions
    - _Requirements: 2.1, 2.5, 4.2, 5.2, 7.2_

  - [ ]* 4.2 Write property test for new images appearing first
    - **Property 7: New images appear first in gallery**
    - **Validates: Requirements 3.3**

  - [ ]* 4.3 Write property test for aspect ratio persistence
    - **Property 6: Aspect ratio persistence**
    - **Validates: Requirements 2.5**

  - [ ]* 4.4 Write property test for delete removing images
    - **Property 9: Delete removes image from gallery**
    - **Validates: Requirements 4.2**

  - [x] 4.5 Add localStorage persistence middleware
    - Configure Zustand persist middleware
    - Serialize/deserialize image data
    - Handle hydration on app load
    - _Requirements: 3.1_

  - [ ]* 4.6 Write unit tests for store actions
    - Test addImage adds to beginning of array
    - Test updateImage modifies correct image
    - Test deleteImage removes correct image
    - Test setEditSource updates state
    - Test clearEditSource resets to null

- [ ] 5. Build PromptInputArea component
  - [x] 5.1 Create component structure with ShadCN components
    - Use Textarea for prompt input
    - Use Select for aspect ratio selector
    - Use Button for submit
    - Add image placeholder area
    - Implement responsive layout
    - _Requirements: 1.1, 2.1, 9.3_

  - [x] 5.2 Implement prompt validation
    - Validate non-empty prompt before submission
    - Show validation error for empty/whitespace prompts
    - Disable submit button when invalid
    - _Requirements: 1.2_

  - [ ]* 5.3 Write property test for prompt validation
    - **Property 1: Non-empty prompt validation**
    - **Validates: Requirements 1.2**

  - [x] 5.4 Implement aspect ratio selector
    - Populate Select with predefined ratios
    - Connect to Zustand store
    - Disable when edit source is present
    - Show default selection
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 5.5 Implement edit source thumbnail display
    - Show thumbnail when editSource is set
    - Display image from gallery or uploaded file
    - Add remove button overlay
    - _Requirements: 5.3, 6.3, 7.1_

  - [ ]* 5.6 Write property test for edit source thumbnail
    - **Property 12: Edit source displays thumbnail**
    - **Validates: Requirements 5.3, 6.3**

  - [x] 5.7 Implement file upload functionality
    - Add file input for image uploads
    - Validate file type (PNG, JPEG only)
    - Show validation errors for invalid files
    - Set uploaded image as edit source
    - Extract and store image dimensions
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 5.8 Write property test for file upload validation
    - **Property 15: File upload validation**
    - **Validates: Requirements 6.2**

  - [x] 5.9 Implement edit source removal
    - Add clear button when edit source present
    - Clear edit source on click
    - Reset to generation mode
    - Re-enable aspect ratio selector
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 5.10 Write property test for edit source clearing
    - **Property 17: Clear edit source resets to generation mode**
    - **Validates: Requirements 7.2, 7.4**

  - [ ]* 5.11 Write property test for aspect ratio control restoration
    - **Property 18: Clearing edit source restores aspect ratio control**
    - **Validates: Requirements 7.3**

  - [x] 5.12 Implement loading state display
    - Show loading indicator during generation
    - Disable inputs while generating
    - Display progress message
    - _Requirements: 8.2_

  - [ ]* 5.13 Write property test for loading indicator
    - **Property 19: Generation start shows loading indicator**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 5.14 Wire up submit handler
    - Connect to BedrockImageService
    - Create placeholder image immediately
    - Call generateImage or editImage based on mode
    - Update store with results
    - Handle errors with toast notifications
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [ ]* 5.15 Write property test for placeholder creation
    - **Property 2: Placeholder creation with correct aspect ratio**
    - **Validates: Requirements 1.3, 3.5**

- [x] 6. Build ImageCard component
  - [x] 6.1 Create component with image display
    - Display image or placeholder based on status
    - Maintain aspect ratio with CSS
    - Show loading spinner for pending/generating states
    - Handle image load errors
    - _Requirements: 3.1, 3.5, 8.1_

  - [x] 6.2 Implement hover action buttons
    - Add delete and edit buttons
    - Show buttons on mouse enter
    - Hide buttons on mouse leave
    - Use ShadCN Button components with icons
    - _Requirements: 4.1, 4.4, 5.1_

  - [ ]* 6.3 Write property test for hover button revelation
    - **Property 8: Hover reveals action buttons**
    - **Validates: Requirements 4.1, 5.1**

  - [ ]* 6.4 Write property test for mouse leave hiding buttons
    - **Property 10: Mouse leave hides action buttons**
    - **Validates: Requirements 4.4**

  - [x] 6.5 Wire up delete action
    - Call store deleteImage action
    - Add confirmation if needed
    - _Requirements: 4.2_

  - [x] 6.6 Wire up edit action
    - Call store setEditSource action
    - Scroll to prompt input area
    - _Requirements: 5.2_

  - [ ]* 6.7 Write property test for edit icon setting edit source
    - **Property 11: Edit icon sets edit source**
    - **Validates: Requirements 5.2**

  - [ ]* 6.8 Write unit tests for ImageCard
    - Test loading state renders spinner
    - Test complete state renders image
    - Test error state renders error message
    - Test hover shows buttons
    - Test delete calls correct action

- [x] 7. Build GalleryGrid component
  - [x] 7.1 Create responsive grid layout
    - Use CSS Grid with auto-fit columns
    - Set minimum and maximum column widths
    - Add gap between items
    - Handle empty state with message
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 7.2 Map images to ImageCard components
    - Pass image data and callbacks
    - Handle concurrent placeholders
    - Maintain image order (newest first)
    - _Requirements: 3.3, 8.4_

  - [ ]* 7.3 Write property test for concurrent placeholders
    - **Property 20: Concurrent generations have separate placeholders**
    - **Validates: Requirements 8.4**

  - [ ]* 7.4 Write unit tests for GalleryGrid
    - Test empty state renders correctly
    - Test images render in correct order
    - Test grid layout responsiveness

- [ ] 8. Build App component and wire everything together
  - [x] 8.1 Create App component structure
    - Setup layout with header and main content
    - Add PromptInputArea at top
    - Add GalleryGrid below
    - Apply global styles
    - _Requirements: 9.4, 9.5_

  - [x] 8.2 Setup Bedrock service context
    - Initialize BedrockImageService
    - Provide via React Context
    - Handle credential configuration
    - _Requirements: 10.3_

  - [x] 8.3 Add error boundary
    - Catch and display runtime errors
    - Provide recovery options
    - Log errors for debugging
    - _Requirements: 1.5_

  - [x] 8.4 Implement toast notifications
    - Use ShadCN Toast component
    - Show success messages for completed generations
    - Show error messages for failures
    - _Requirements: 1.5, 10.5_

  - [ ]* 8.5 Write property test for successful generation flow
    - **Property 3: Successful generation replaces placeholder**
    - **Validates: Requirements 1.4**

  - [ ]* 8.6 Write property test for failed generation flow
    - **Property 4: Failed generation shows error and removes placeholder**
    - **Validates: Requirements 1.5**

  - [ ]* 8.7 Write property test for edit completion
    - **Property 14: Edit completion adds new gallery entry**
    - **Validates: Requirements 5.5**

  - [ ]* 8.8 Write integration tests for end-to-end flows
    - Test generate image from scratch flow
    - Test edit existing image flow
    - Test upload and edit custom image flow
    - Test delete image flow
    - Test concurrent generation handling

- [ ] 9. Add accessibility features
  - Add ARIA labels to all interactive elements
  - Implement keyboard navigation
  - Add focus management
  - Test with screen readers
  - Ensure proper heading hierarchy
  - Add alt text to images using prompts
  - _Requirements: 9.3, 9.4_

- [ ] 10. Implement performance optimizations
  - Convert Base64 to object URLs for large images
  - Implement object URL cleanup on delete
  - Add request cancellation for abandoned generations
  - Debounce aspect ratio changes
  - Add virtual scrolling if needed for large galleries
  - _Requirements: 3.1, 3.3_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
