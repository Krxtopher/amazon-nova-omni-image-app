# AWS Amplify Deployment Guide

This guide provides step-by-step instructions for deploying the AWS Amplify Image Generator application to production using AWS Amplify Hosting with CI/CD.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account**: Active AWS account with appropriate permissions
2. **GitHub Repository**: Code pushed to a GitHub repository
3. **AWS CLI**: Installed and configured with appropriate credentials
4. **Node.js**: Version 18 or later installed locally

## Deployment Options

### Option 1: AWS Amplify Console (Recommended)

This is the easiest method for setting up CI/CD with automatic deployments.

#### Step 1: Connect Your Repository

1. **Open AWS Amplify Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"

2. **Connect Repository**
   - Select "GitHub" as your repository service
   - Authorize AWS Amplify to access your GitHub account
   - Select your repository and branch (typically `main`)

#### Step 2: Configure Build Settings

1. **App Name**: Enter a descriptive name (e.g., "image-generator-app")

2. **Build Settings**: The console should auto-detect the `amplify.yml` file. If not, use this configuration:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - echo "Building Amplify backend..."
        - npm ci --cache .npm --prefer-offline --prefix amplify
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - echo "Installing frontend dependencies..."
        - npm ci --cache .npm --prefer-offline
        - echo "Generating Amplify configuration..."
        - npx ampx generate outputs --app-id $AWS_APP_ID --branch $AWS_BRANCH --out-dir src/
    build:
      commands:
        - echo "Building React application..."
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - .npm/**/*
      - node_modules/**/*
      - amplify/node_modules/**/*
```

3. **Advanced Settings**:
   - **Node.js version**: 18
   - **Build timeout**: 15 minutes (for initial deployment)

#### Step 3: Configure Environment Variables

Add these environment variables in the Amplify Console:

**Required Variables:**
- `DOMAIN_RESTRICTIONS_ENABLED`: `true` or `false`
- `ALLOWED_DOMAINS`: Comma-separated list (e.g., `@yourcompany.com,@partner.com`)
- `DOMAIN_RESTRICTION_ERROR_MESSAGE`: Custom error message

**Optional Variables:**
- `NODE_ENV`: `production`
- `VITE_APP_REGION`: Your AWS region (e.g., `us-east-1`)

#### Step 4: Deploy

1. Click "Save and deploy"
2. Monitor the build process in the Amplify Console
3. The first deployment may take 10-15 minutes

### Option 2: AWS CLI Deployment

For advanced users who prefer command-line deployment.

#### Step 1: Create Amplify App

```bash
# Create the Amplify app
aws amplify create-app \
  --name "image-generator-app" \
  --description "AWS Amplify Image Generator with Authentication" \
  --repository "https://github.com/yourusername/your-repo" \
  --platform "WEB" \
  --iam-service-role "arn:aws:iam::YOUR-ACCOUNT:role/amplifyconsole-backend-role"
```

#### Step 2: Create Branch

```bash
# Create a branch for deployment
aws amplify create-branch \
  --app-id "YOUR-APP-ID" \
  --branch-name "main" \
  --description "Production branch" \
  --enable-auto-build
```

#### Step 3: Set Environment Variables

```bash
# Set domain restrictions
aws amplify update-app \
  --app-id "YOUR-APP-ID" \
  --environment-variables \
    DOMAIN_RESTRICTIONS_ENABLED=true,\
    ALLOWED_DOMAINS=@yourcompany.com,\
    DOMAIN_RESTRICTION_ERROR_MESSAGE="Registration restricted to company employees"
```

#### Step 4: Start Deployment

```bash
# Trigger initial deployment
aws amplify start-job \
  --app-id "YOUR-APP-ID" \
  --branch-name "main" \
  --job-type "RELEASE"
```

## Post-Deployment Configuration

### 1. Custom Domain (Optional)

If you want to use a custom domain:

1. **In Amplify Console**:
   - Go to "Domain management"
   - Click "Add domain"
   - Enter your domain name
   - Follow DNS configuration instructions

2. **SSL Certificate**: Amplify automatically provisions SSL certificates

### 2. Monitoring and Logging

1. **CloudWatch Integration**: Amplify automatically sends logs to CloudWatch
2. **Build Logs**: Available in the Amplify Console under each deployment
3. **Lambda Logs**: Check CloudWatch for Lambda function logs

### 3. Environment-Specific Configurations

For multiple environments (dev, staging, prod):

1. **Create Additional Branches**:
   ```bash
   aws amplify create-branch \
     --app-id "YOUR-APP-ID" \
     --branch-name "develop" \
     --description "Development branch"
   ```

2. **Set Environment-Specific Variables**:
   - Use different `ALLOWED_DOMAINS` for each environment
   - Configure different error messages
   - Set appropriate `NODE_ENV` values

## Troubleshooting

### Common Build Issues

1. **Node.js Version Mismatch**:
   ```yaml
   # Add to amplify.yml frontend.phases.preBuild.commands
   - nvm use 18
   ```

2. **Dependency Installation Failures**:
   ```yaml
   # Clear cache and reinstall
   - rm -rf node_modules package-lock.json
   - npm install
   ```

3. **Amplify Configuration Generation Fails**:
   - Ensure `AWS_APP_ID` and `AWS_BRANCH` environment variables are set
   - Check IAM permissions for the Amplify service role

### Backend Deployment Issues

1. **Lambda Function Timeouts**:
   - Increase timeout in function definitions
   - Check CloudWatch logs for specific errors

2. **DynamoDB Access Issues**:
   - Verify IAM roles have proper DynamoDB permissions
   - Check table names and regions

3. **S3 Storage Issues**:
   - Verify bucket policies and CORS configuration
   - Check IAM permissions for S3 access

### Frontend Issues

1. **Authentication Not Working**:
   - Verify `amplifyconfiguration.json` is generated correctly
   - Check Cognito User Pool configuration
   - Ensure domain restrictions are properly configured

2. **API Calls Failing**:
   - Check Lambda function logs in CloudWatch
   - Verify API Gateway configuration
   - Test authentication token validation

## Security Considerations

### 1. IAM Roles and Permissions

Ensure the Amplify service role has minimal required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:*",
        "cloudformation:*",
        "lambda:*",
        "dynamodb:*",
        "s3:*",
        "cognito-idp:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Environment Variables

- Never commit sensitive values to version control
- Use AWS Systems Manager Parameter Store for sensitive configuration
- Rotate credentials regularly

### 3. Domain Restrictions

- Regularly review and update allowed domains
- Monitor authentication logs for suspicious activity
- Consider implementing additional security measures for sensitive applications

## Monitoring and Maintenance

### 1. Regular Updates

- Keep Amplify CLI and dependencies updated
- Monitor AWS service updates and deprecations
- Review and update security configurations

### 2. Performance Monitoring

- Monitor CloudWatch metrics for Lambda functions
- Track DynamoDB performance and costs
- Monitor S3 storage usage and costs

### 3. Backup and Recovery

- DynamoDB: Enable point-in-time recovery
- S3: Configure versioning and lifecycle policies
- Code: Maintain regular backups of your repository

## Cost Optimization

### 1. Resource Optimization

- Use appropriate Lambda memory settings
- Configure DynamoDB on-demand billing for variable workloads
- Implement S3 lifecycle policies for old images

### 2. Monitoring Costs

- Set up AWS Cost Alerts
- Monitor usage patterns and optimize accordingly
- Consider reserved capacity for predictable workloads

## Support and Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- [GitHub Repository Issues](https://github.com/yourusername/your-repo/issues)
- [AWS Support](https://aws.amazon.com/support/)

## Rollback Procedures

If you need to rollback a deployment:

1. **Via Amplify Console**:
   - Go to the app in Amplify Console
   - Select the branch
   - Click on a previous successful deployment
   - Click "Redeploy this version"

2. **Via Git**:
   - Revert the problematic commit in your repository
   - Push the changes to trigger automatic redeployment

3. **Emergency Rollback**:
   - Disable the problematic branch in Amplify Console
   - Deploy from a known good branch or commit