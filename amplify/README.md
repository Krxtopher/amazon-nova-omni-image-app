# Amplify Gen 2 Backend

This directory contains the AWS Amplify Gen 2 backend configuration for the Image Generator application.

## Setup

The backend includes:
- **Authentication**: Cognito user pool with email-based authentication
- **Data**: DynamoDB tables for ImageMetadata and PersonaData with user isolation
- **Storage**: S3 bucket with user-scoped access controls

## Development

To start the sandbox environment:
```bash
npm run amplify:sandbox
```

This will:
1. Deploy the backend resources to AWS
2. Generate the `amplifyconfiguration.json` file
3. Watch for changes and redeploy automatically

## Deployment

For production deployment:
```bash
npm run amplify:deploy
```

## Configuration

The backend is defined in:
- `backend.ts` - Main backend configuration
- `auth/resource.ts` - Authentication configuration
- `data/resource.ts` - Database schema and models
- `storage/resource.ts` - S3 storage configuration

## Next Steps

After running the sandbox:
1. The `amplifyconfiguration.json` will be generated in the `src/` directory
2. Uncomment the Amplify configuration in `src/main.tsx`
3. The frontend will be ready to use the backend services