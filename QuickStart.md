# QuickStart Guide

Get the AWS Amplify AI Image Generator running locally for development testing in under 10 minutes.

## Prerequisites

Before you start, ensure you have:

- **Node.js 18+** and npm installed
- **AWS Account** with access to Amazon Bedrock
- **AWS CLI** installed and configured
- **Git** for cloning the repository

## Quick Setup (5 Steps)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

Copy the environment template and add your AWS credentials:

```bash
cp .env.example .env
```

Edit `.env` with your AWS credentials:

```env
# AWS Configuration for Amazon Bedrock
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Use streaming enhancement (recommended)
VITE_USE_STREAMING_ENHANCEMENT=true
```

**⚠️ Security Note**: For production, use AWS Cognito Identity Pool instead of hardcoded credentials.

### 3. Set Up Amplify Backend

Start the Amplify sandbox to deploy backend resources:

```bash
npm run amplify:sandbox
```

This command will:
- Deploy AWS Lambda functions for image generation and prompt enhancement
- Set up DynamoDB tables for data storage
- Configure S3 buckets for image storage
- Generate the `amplify_outputs.json` configuration file

**Keep this running** - it provides hot-reloading for backend changes.

### 4. Start Development Server

In a **new terminal window**, start the frontend:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 5. Test the Application

1. **Open** `http://localhost:5173` in your browser
2. **Sign up** for a new account (if authentication is enabled)
3. **Generate an image** by entering a prompt like "A sunset over mountains"
4. **Verify** the image appears in the gallery

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run amplify:sandbox` | Start Amplify backend sandbox |
| `npm run amplify:deploy` | Deploy to production |

## Development Features

### Rate Limiting Test
Visit `http://localhost:5173/test-rate-limit` to test the rate limiting functionality:
1. Set rate limit to 1 request per minute
2. Submit multiple requests to see queuing behavior

### Testing
The application includes comprehensive testing:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in watch mode during development
npm run test:watch
```

## Troubleshooting

### Common Issues

**1. AWS Credentials Error**
```
Error: Unable to locate credentials
```
**Solution**: Ensure your `.env` file has valid AWS credentials and the AWS CLI is configured.

**2. Amplify Sandbox Fails**
```
Error: Unable to assume role
```
**Solution**: Check your AWS permissions. You need access to create Lambda functions, DynamoDB tables, and S3 buckets.

**3. Build Errors**
```
Module not found: Can't resolve './amplify_outputs.json'
```
**Solution**: Run `npm run amplify:sandbox` first to generate the configuration file.

**4. Bedrock Access Denied**
```
Error: Access denied to Amazon Bedrock
```
**Solution**: 
- Ensure your AWS region supports Bedrock (us-east-1, us-west-2, etc.)
- Request access to Amazon Bedrock models in the AWS Console
- Verify your IAM user/role has `bedrock:InvokeModel` permissions

### Getting Help

1. **Check the logs**: Look at the browser console and terminal output
2. **Review documentation**: See `README.md` for detailed information
3. **Check AWS Console**: Verify resources are deployed correctly
4. **Test AWS CLI**: Run `aws sts get-caller-identity` to verify credentials

## Next Steps

Once you have the application running:

1. **Explore the codebase**: Check out the project structure in `README.md`
2. **Review the specs**: See `.kiro/specs/` for detailed requirements and design
3. **Run tests**: Ensure everything works with `npm test`
4. **Deploy to production**: Follow `DEPLOYMENT_GUIDE.md` when ready

## Project Structure Overview

```
├── src/
│   ├── components/     # React UI components
│   ├── services/       # AWS Bedrock integration
│   ├── stores/         # State management (Zustand)
│   ├── types/          # TypeScript definitions
│   └── utils/          # Helper functions
├── amplify/            # AWS Amplify backend configuration
│   ├── functions/      # Lambda functions
│   ├── data/           # DynamoDB schema
│   └── storage/        # S3 configuration
└── .kiro/specs/        # Feature specifications
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_AWS_REGION` | Yes | AWS region (e.g., us-east-1) |
| `VITE_AWS_ACCESS_KEY_ID` | Yes* | AWS access key |
| `VITE_AWS_SECRET_ACCESS_KEY` | Yes* | AWS secret key |
| `VITE_USE_STREAMING_ENHANCEMENT` | No | Enable streaming (default: true) |

*Required for development. Use Cognito for production.

---

**Ready to start developing?** Run `npm run amplify:sandbox` and `npm run dev` to get started! 🚀