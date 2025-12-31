#!/bin/bash

echo "Setting up Amplify Gen 2 backend..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Start the sandbox
echo "🚀 Starting Amplify sandbox..."
echo "This will deploy the backend resources and generate the configuration file."
echo "Press Ctrl+C to stop the sandbox when you're done developing."

npm run amplify:sandbox