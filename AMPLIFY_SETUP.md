# AWS Amplify Gen 2 Setup Guide

This document explains how to complete the Amplify Gen 2 backend setup for the Image Generator application.

## Prerequisites

1. **AWS CLI configured**: Run `aws configure` with your AWS credentials
2. **Node.js and npm**: Already installed (verified by successful dependency installation)
3. **Amplify CLI**: Already installed globally

## Backend Infrastructure Created

The following Amplify Gen 2 backend resources have been configured:

### 1. Authentication (`amplify/auth/resource.ts`)
- Cognito User Pool with email-based authentication
- Email verification with verification codes
- Account recovery via email only
- Ready for domain restrictions (to be configured in task 2)

### 2. Data Models (`amplify/data/resource.ts`)
- **ImageMetadata**: Stores image generation metadata with user isolation
- **PersonaData**: Stores user-created personas with user isolation
- Owner-based authorization ensures users only access their own data

### 3. Storage (`amplify/storage/resource.ts`)
- S3 bucket with user-scoped access controls
- Images stored under `images/{user_id}/` structure
- Public folder for shared assets

## Next Steps

### 1. Deploy the Sandbox Environment

To start developing with the backend:

```bash
# Option 1: Use the setup script
./scripts/setup-amplify.sh

# Option 2: Run directly
npm run amplify:sandbox
```

This will:
- Deploy all backend resources to AWS
- Generate `src/amplifyconfiguration.json`
- Watch for changes and auto-redeploy

### 2. Enable Frontend Integration

After the sandbox is running:

1. Uncomment the Amplify imports in `src/main.tsx`:
   ```typescript
   import { Amplify } from 'aws-amplify'
   import outputs from './amplifyconfiguration.json'
   Amplify.configure(outputs)
   ```

2. The application will be ready to use authentication, data, and storage services

### 3. Development Workflow

- Keep the sandbox running during development
- Changes to `amplify/` files will trigger automatic redeployment
- The configuration file will be updated automatically

## Project Structure

```
amplify/
├── auth/resource.ts      # Authentication configuration
├── data/resource.ts      # Database schema and models
├── storage/resource.ts   # S3 storage configuration
├── backend.ts           # Main backend definition
├── package.json         # Backend dependencies
└── tsconfig.json        # TypeScript configuration

src/
├── amplifyconfiguration.json  # Generated after sandbox deployment
└── main.tsx                   # Frontend Amplify integration
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **6.4**: Backend infrastructure with auth, data, and storage resources ✅
- **6.5**: Development environment and sandbox setup ✅

## Troubleshooting

### AWS CLI Not Configured
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

### Sandbox Deployment Issues
- Ensure AWS credentials have sufficient permissions
- Check that the region supports all required services
- Verify no conflicting Amplify projects exist

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript compilation passes in the `amplify/` directory

## Security Notes

- All resources use least-privilege access controls
- User data is isolated using Amplify's owner-based authorization
- S3 access is scoped to individual user folders
- Authentication tokens are managed automatically by Amplify