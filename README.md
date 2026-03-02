# AI Image Generator

An AI-powered image generation and editing application built with React, TypeScript, and Amazon Bedrock's Nova 2 Omni model. Features include prompt enhancement with streaming responses, persona-based generation, SQLite-based persistence, and advanced UI effects.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Components**: ShadCN UI (Radix UI + Tailwind CSS)
- **State Management**: Zustand with SQLite persistence (via sql.js + IndexedDB)
- **AWS SDK**: @aws-sdk/client-bedrock-runtime (Converse & ConverseStream APIs)
- **Routing**: React Router v7
- **Notifications**: Sonner (toast notifications)
- **Testing**: Vitest, React Testing Library, fast-check (property-based testing)
- **Icons**: Lucide React

## Key Features

- Generate images from text prompts using Amazon Bedrock Nova 2 Omni
- Prompt enhancement with streaming responses using Nova models
- Persona-based image generation with custom and standard personas
- Edit existing images with new prompts
- Upload custom images for editing
- Virtualized masonry gallery with horizontal and vertical layouts
- Aspect ratio selection (1:1, 16:9, 9:16, 21:9, 9:21)
- SQLite-based storage with binary data in IndexedDB
- Request throttling with configurable rate limits
- Lightbox view for full-size images
- Magical loading effects with WebGL shaders

## Developer Setup

### Prerequisites

- Node.js 18+ and npm
- AWS Account with access to Amazon Bedrock
- AWS credentials with permissions to invoke Bedrock models (Nova 2 Omni, Nova 2 Lite)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your AWS credentials:
```env
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key_here
VITE_USE_STREAMING_ENHANCEMENT=false
```

**Security Note**: For production applications, use AWS Cognito Identity Pool or AWS Amplify instead of hardcoded credentials. See `src/App.tsx` for implementation guidance.

### Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Linting

```bash
npm run lint
```

## Project Structure

### Key Directories

```
src/
├── components/          # React components
│   ├── ui/             # Reusable ShadCN UI components
│   ├── ImageCard.tsx   # Gallery image card with actions
│   ├── Lightbox.tsx    # Full-screen image viewer
│   ├── MasonryGrid.tsx # Virtualized masonry layouts
│   ├── PromptInputArea.tsx  # Main prompt input interface
│   ├── PersonaSelector.tsx  # Persona selection UI
│   └── SettingsModal.tsx    # App settings
├── services/           # Business logic and API services
│   ├── BedrockImageService.ts              # Image generation
│   ├── PromptEnhancementService.ts         # Non-streaming enhancement
│   ├── StreamingPromptEnhancementService.ts # Streaming enhancement
│   ├── BinaryStorageService.ts             # IndexedDB storage
│   ├── ThrottlingService.ts                # Request rate limiting
│   ├── sqliteService.ts                    # SQLite database
│   └── personaService.ts                   # Persona management
├── stores/             # Zustand state management
│   ├── imageStore.ts   # Image data and operations
│   ├── uiStore.ts      # UI state (theme, layout, modals)
│   └── throttlingStore.ts  # Throttling state
├── contexts/           # React contexts
│   └── BedrockServiceContext.tsx
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── lib/                # Utility functions
```

### Reusable Components

These components are designed to be reusable in other projects:

#### UI Components (`src/components/ui/`)
- `auto-expanding-textarea.tsx` - Textarea that grows with content
- `button-group.tsx` - Grouped button component
- `prompt-input-textarea.tsx` - Specialized textarea for prompts
- Standard ShadCN components (button, card, dialog, select, etc.)

#### Specialized Components
- `MagicalImagePlaceholder.tsx` - Animated loading placeholder with multiple effect variants
- `MagicalLoadingEffect.tsx` - CSS-based magical loading animation
- `ShaderMagicalEffect.tsx` - WebGL shader-based loading effect
- `MasonryGrid.tsx` - Virtualized masonry grid (horizontal & vertical)
- `SimpleVirtualizedGallery.tsx` - Infinite scroll gallery with viewport-aware loading
- `Lightbox.tsx` - Full-screen image viewer with navigation
- `ColorPicker.tsx` - Color selection component
- `AspectRatioSelector.tsx` - Aspect ratio selection UI
- `WordRevealContainer.tsx` - Animated word reveal effect

#### Services
- `BinaryStorageService.ts` - IndexedDB storage for binary data
- `ThrottlingService.ts` - Request rate limiting with queue management
- `sqliteService.ts` - SQLite database wrapper for sql.js

#### Hooks
- `useInfiniteScroll.ts` - Infinite scroll implementation
- `useViewportAwareLoading.ts` - Load content to fill viewport
- `useViewportVisibility.ts` - Track element visibility
- `useBodyScrollLock.ts` - Lock body scroll (for modals)
- `useDynamicLineClamp.ts` - Dynamic text truncation

## Additional Tools

### Icon Embedding Generator (`preprocessing/`)

Python scripts for generating embeddings for Lucide icons using Amazon Bedrock's Nova Multimodal Embeddings model. Used for semantic icon search functionality.

See `preprocessing/README.md` for setup and usage instructions.

## Environment Variables

- `VITE_AWS_REGION` - AWS region (default: us-east-1)
- `VITE_AWS_ACCESS_KEY_ID` - AWS access key
- `VITE_AWS_SECRET_ACCESS_KEY` - AWS secret key
- `VITE_USE_STREAMING_ENHANCEMENT` - Use streaming API for prompt enhancement (default: true)

## Architecture Notes

- **State Management**: Zustand stores with SQLite persistence for metadata and IndexedDB for binary image data
- **Image Storage**: Images stored as base64 in IndexedDB, metadata in SQLite
- **Virtualization**: Masonry grids use virtualization for performance with large galleries
- **Throttling**: Request queue system prevents API rate limit errors
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Streaming**: Prompt enhancement uses ConverseStream API for real-time responses
