# AI Image Generator

An AI-powered image generation and editing application built with React, TypeScript, and Amazon Bedrock's Nova 2 Omni model via the Converse API.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Components**: ShadCN UI (Radix UI + Tailwind CSS)
- **State Management**: Zustand with SQLite persistence (via sql.js + IndexedDB)
- **AWS SDK**: @aws-sdk/client-bedrock-runtime (Converse API)
- **Notifications**: Sonner (toast notifications)
- **Testing**: Vitest, React Testing Library, fast-check (property-based testing)

## Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # ShadCN UI components
│   ├── ErrorBoundary.tsx
│   ├── ThemeProvider.tsx
│   ├── PromptInputArea.tsx
│   ├── GalleryGrid.tsx
│   └── ImageCard.tsx
├── contexts/        # React contexts
│   └── BedrockServiceContext.tsx
├── services/        # AWS Bedrock service layer
│   └── BedrockImageService.ts
├── stores/          # Zustand state management
│   └── imageStore.ts
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
│   └── ErrorHandler.ts
├── lib/             # Library utilities (cn helper)
└── test/            # Test setup and utilities
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS Account with access to Amazon Bedrock
- AWS credentials with permissions to invoke Bedrock models

### Install Dependencies

```bash
npm install
```

### Configure AWS Credentials

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your AWS credentials:
```env
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

**Important**: For production applications, use AWS Cognito Identity Pool or AWS Amplify instead of hardcoded credentials. See `src/App.tsx` for implementation guidance.

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Features

- Generate images from text prompts using Amazon Bedrock Nova Canvas
- Edit existing images with new prompts
- Upload custom images for editing
- Manage images in a responsive gallery grid
- Aspect ratio selection for generated images
- Real-time loading indicators and error handling
- **Enhanced Storage**: SQLite-based storage with much larger capacity than localStorage

## Requirements

See `.kiro/specs/ai-image-generator/requirements.md` for detailed requirements.

## Design

See `.kiro/specs/ai-image-generator/design.md` for architecture and design details.

## Implementation Tasks

See `.kiro/specs/ai-image-generator/tasks.md` for the implementation plan.
