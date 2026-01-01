# AWS Amplify Hosting Setup

This document provides a quick overview of the AWS Amplify hosting configuration for the Image Generator application.

## Quick Start

### 1. Automated Setup (Recommended)

Run the automated setup script to configure AWS Amplify hosting:

```bash
npm run deploy:setup
```

This script will:
- Check prerequisites (AWS CLI, Node.js)
- Gather deployment configuration
- Create IAM roles and Amplify app
- Configure environment variables
- Start the initial deployment

### 2. Manual Setup

If you prefer manual configuration, follow the detailed instructions in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## Configuration Files

- **`amplify.yml`**: CI/CD build configuration
- **`amplify-config.json`**: Complete configuration reference
- **`DEPLOYMENT_GUIDE.md`**: Detailed deployment instructions
- **`DOMAIN_CONFIGURATION.md`**: Email domain restriction setup

## Key Features

✅ **Automatic CI/CD**: Deploys on every push to main branch  
✅ **SSL/HTTPS**: Automatic SSL certificate provisioning  
✅ **Custom Domains**: Support for custom domain configuration  
✅ **Environment Variables**: Configurable domain restrictions  
✅ **Monitoring**: Integrated CloudWatch logging  
✅ **Rollback**: Easy rollback to previous deployments  

## Environment Variables

Configure these in the AWS Amplify Console:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DOMAIN_RESTRICTIONS_ENABLED` | Yes | Enable domain restrictions | `true` |
| `ALLOWED_DOMAINS` | Yes | Allowed email domains | `@company.com,@partner.com` |
| `DOMAIN_RESTRICTION_ERROR_MESSAGE` | No | Custom error message | `Registration restricted` |

## Useful Commands

```bash
# Setup hosting
npm run deploy:setup

# Check deployment status
npm run deploy:status

# Configure domain restrictions
npm run config:domains

# Start local development
npm run amplify:sandbox

# Manual deployment
npm run amplify:deploy
```

## Monitoring

- **Build Logs**: AWS Amplify Console → Your App → Build History
- **Application Logs**: AWS CloudWatch → Log Groups
- **Lambda Logs**: AWS CloudWatch → Log Groups → `/aws/lambda/`

## Support

- 📖 [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- 🔧 [Domain Configuration](./DOMAIN_CONFIGURATION.md)
- 🚀 [Amplify Setup](./AMPLIFY_SETUP.md)
- 🐛 [GitHub Issues](https://github.com/yourusername/your-repo/issues)

## Security

- All data is user-scoped and isolated
- Authentication required for all operations
- Configurable email domain restrictions
- JWT token validation on all API calls
- S3 access controls prevent cross-user access