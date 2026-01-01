#!/bin/bash

# AWS Amplify Hosting Setup Script
# This script helps set up AWS Amplify hosting for the Image Generator application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is installed and configured
check_aws_cli() {
    print_status "Checking AWS CLI installation..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first:"
        echo "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS CLI is installed and configured"
}

# Function to check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to get user input
get_user_input() {
    print_status "Gathering deployment configuration..."
    
    # App name
    read -p "Enter Amplify app name (default: image-generator-app): " APP_NAME
    APP_NAME=${APP_NAME:-image-generator-app}
    
    # Repository URL
    read -p "Enter GitHub repository URL (e.g., https://github.com/username/repo): " REPO_URL
    if [[ -z "$REPO_URL" ]]; then
        print_error "Repository URL is required"
        exit 1
    fi
    
    # Branch name
    read -p "Enter branch name (default: main): " BRANCH_NAME
    BRANCH_NAME=${BRANCH_NAME:-main}
    
    # Domain restrictions
    read -p "Enable domain restrictions? (y/n, default: y): " ENABLE_RESTRICTIONS
    ENABLE_RESTRICTIONS=${ENABLE_RESTRICTIONS:-y}
    
    if [[ "$ENABLE_RESTRICTIONS" == "y" || "$ENABLE_RESTRICTIONS" == "Y" ]]; then
        read -p "Enter allowed domains (comma-separated, e.g., @company.com,@partner.com): " ALLOWED_DOMAINS
        if [[ -z "$ALLOWED_DOMAINS" ]]; then
            print_warning "No domains specified. Using @amazon.com as default."
            ALLOWED_DOMAINS="@amazon.com"
        fi
        
        read -p "Enter custom error message (optional): " ERROR_MESSAGE
        ERROR_MESSAGE=${ERROR_MESSAGE:-"Registration is restricted to approved email domains."}
        
        DOMAIN_RESTRICTIONS_ENABLED="true"
    else
        DOMAIN_RESTRICTIONS_ENABLED="false"
        ALLOWED_DOMAINS=""
        ERROR_MESSAGE=""
    fi
    
    # AWS Region
    read -p "Enter AWS region (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
}

# Function to create IAM role for Amplify
create_amplify_role() {
    print_status "Creating IAM role for Amplify..."
    
    ROLE_NAME="AmplifyConsoleServiceRole-${APP_NAME}"
    
    # Check if role already exists
    if aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
        print_warning "IAM role $ROLE_NAME already exists. Skipping creation."
        return
    fi
    
    # Create trust policy
    cat > /tmp/amplify-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "amplify.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create the role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/amplify-trust-policy.json \
        --region "$AWS_REGION"
    
    # Attach necessary policies
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"
    
    print_success "IAM role created: $ROLE_NAME"
    
    # Clean up
    rm -f /tmp/amplify-trust-policy.json
}

# Function to create Amplify app
create_amplify_app() {
    print_status "Creating Amplify app..."
    
    # Get account ID for IAM role ARN
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/AmplifyConsoleServiceRole-${APP_NAME}"
    
    # Create the app
    APP_ID=$(aws amplify create-app \
        --name "$APP_NAME" \
        --description "AWS Amplify Image Generator with Authentication" \
        --repository "$REPO_URL" \
        --platform "WEB" \
        --iam-service-role "$ROLE_ARN" \
        --region "$AWS_REGION" \
        --query 'app.appId' \
        --output text)
    
    if [[ -z "$APP_ID" ]]; then
        print_error "Failed to create Amplify app"
        exit 1
    fi
    
    print_success "Amplify app created with ID: $APP_ID"
    echo "$APP_ID" > .amplify-app-id
}

# Function to create branch
create_branch() {
    print_status "Creating branch: $BRANCH_NAME"
    
    aws amplify create-branch \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --description "Production branch" \
        --enable-auto-build \
        --region "$AWS_REGION"
    
    print_success "Branch created: $BRANCH_NAME"
}

# Function to set environment variables
set_environment_variables() {
    print_status "Setting environment variables..."
    
    ENV_VARS="NODE_ENV=production"
    
    if [[ "$DOMAIN_RESTRICTIONS_ENABLED" == "true" ]]; then
        ENV_VARS="${ENV_VARS},DOMAIN_RESTRICTIONS_ENABLED=true"
        ENV_VARS="${ENV_VARS},ALLOWED_DOMAINS=${ALLOWED_DOMAINS}"
        if [[ -n "$ERROR_MESSAGE" ]]; then
            ENV_VARS="${ENV_VARS},DOMAIN_RESTRICTION_ERROR_MESSAGE=${ERROR_MESSAGE}"
        fi
    else
        ENV_VARS="${ENV_VARS},DOMAIN_RESTRICTIONS_ENABLED=false"
    fi
    
    aws amplify update-app \
        --app-id "$APP_ID" \
        --environment-variables "$ENV_VARS" \
        --region "$AWS_REGION"
    
    print_success "Environment variables configured"
}

# Function to start deployment
start_deployment() {
    print_status "Starting initial deployment..."
    
    JOB_ID=$(aws amplify start-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --job-type "RELEASE" \
        --region "$AWS_REGION" \
        --query 'jobSummary.jobId' \
        --output text)
    
    print_success "Deployment started with Job ID: $JOB_ID"
    
    # Get the app URL
    APP_URL=$(aws amplify get-app \
        --app-id "$APP_ID" \
        --region "$AWS_REGION" \
        --query 'app.defaultDomain' \
        --output text)
    
    print_success "Your app will be available at: https://${BRANCH_NAME}.${APP_URL}"
}

# Function to display summary
display_summary() {
    echo ""
    echo "=========================================="
    echo "         DEPLOYMENT SUMMARY"
    echo "=========================================="
    echo "App Name: $APP_NAME"
    echo "App ID: $APP_ID"
    echo "Repository: $REPO_URL"
    echo "Branch: $BRANCH_NAME"
    echo "Region: $AWS_REGION"
    echo "Domain Restrictions: $DOMAIN_RESTRICTIONS_ENABLED"
    if [[ "$DOMAIN_RESTRICTIONS_ENABLED" == "true" ]]; then
        echo "Allowed Domains: $ALLOWED_DOMAINS"
    fi
    echo ""
    echo "Next Steps:"
    echo "1. Monitor the deployment in the AWS Amplify Console"
    echo "2. Configure custom domain (optional)"
    echo "3. Set up monitoring and alerts"
    echo "4. Review security settings"
    echo ""
    echo "Useful Commands:"
    echo "- Check deployment status: aws amplify list-jobs --app-id $APP_ID --branch-name $BRANCH_NAME"
    echo "- View app details: aws amplify get-app --app-id $APP_ID"
    echo "- Update environment variables: aws amplify update-app --app-id $APP_ID --environment-variables KEY=VALUE"
    echo ""
    echo "Documentation:"
    echo "- Deployment Guide: ./DEPLOYMENT_GUIDE.md"
    echo "- Domain Configuration: ./DOMAIN_CONFIGURATION.md"
    echo "=========================================="
}

# Main execution
main() {
    echo "🚀 AWS Amplify Hosting Setup"
    echo "This script will help you deploy your Image Generator app to AWS Amplify"
    echo ""
    
    check_prerequisites
    check_aws_cli
    get_user_input
    
    echo ""
    print_status "Starting Amplify setup with the following configuration:"
    echo "  App Name: $APP_NAME"
    echo "  Repository: $REPO_URL"
    echo "  Branch: $BRANCH_NAME"
    echo "  Region: $AWS_REGION"
    echo "  Domain Restrictions: $DOMAIN_RESTRICTIONS_ENABLED"
    echo ""
    
    read -p "Continue with this configuration? (y/n): " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        print_warning "Setup cancelled by user"
        exit 0
    fi
    
    create_amplify_role
    create_amplify_app
    create_branch
    set_environment_variables
    start_deployment
    display_summary
    
    print_success "Amplify hosting setup completed successfully!"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi