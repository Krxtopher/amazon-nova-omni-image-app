import { defineBackend } from '@aws-amplify/backend';
import { Duration, Stack } from 'aws-cdk-lib';
import {
    AuthorizationType,
    Cors,
    LambdaIntegration,
    RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { emailDomainValidator } from './functions/email-domain-validator/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
    auth,
    data,
    storage,
    emailDomainValidator,
});

// Disable unauthenticated (guest) access to the Cognito Identity Pool.
// This app requires sign-in for all functionality — no guest access is needed.
// Leaving unauthenticated identities enabled allows anyone with the Identity Pool ID
// to obtain AWS credentials, which is a security risk.
const { cfnIdentityPool } = backend.auth.resources.cfnResources;
cfnIdentityPool.allowUnauthenticatedIdentities = false;

// Disable self-registration on the Cognito User Pool.
// Only admins should be able to create user accounts.
// This prevents unauthorized users from signing up, even if they have a valid email domain.
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
    allowAdminCreateUserOnly: true,
};

// Create a new API stack for REST API and Lambda functions
const apiStack = backend.createStack('api-stack');

// Get the S3 bucket from Amplify Storage
const storageBucket = backend.storage.resources.bucket;

// Create Lambda functions using CDK
const generateImageFunction = new lambda.NodejsFunction(apiStack, 'GenerateImageFunction', {
    entry: './amplify/functions/generate-image/handler.ts',
    runtime: Runtime.NODEJS_18_X,
    timeout: Duration.seconds(60),
    memorySize: 512,
    environment: {
        BEDROCK_REGION: 'us-east-1',
        STORAGE_BUCKET_NAME: storageBucket.bucketName,
    },
});

const enhancePromptFunction = new lambda.NodejsFunction(apiStack, 'EnhancePromptFunction', {
    entry: './amplify/functions/enhance-prompt/handler.ts',
    runtime: Runtime.NODEJS_18_X,
    timeout: Duration.seconds(30),
    environment: {
        BEDROCK_REGION: 'us-east-1',
    },
});

// Add Bedrock permissions to Lambda functions
generateImageFunction.addToRolePolicy(new PolicyStatement({
    actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
    ],
    resources: [
        'arn:aws:bedrock:*::foundation-model/amazon.nova-2-omni-v1:0',
        'arn:aws:bedrock:*::foundation-model/us.amazon.nova-2-omni-v1:0',
        `arn:aws:bedrock:*:${Stack.of(apiStack).account}:inference-profile/amazon.nova-2-omni-v1:0`,
        `arn:aws:bedrock:*:${Stack.of(apiStack).account}:inference-profile/us.amazon.nova-2-omni-v1:0`,
    ],
}));

// Grant the generate-image Lambda permission to write to the S3 storage bucket
storageBucket.grantWrite(generateImageFunction);

enhancePromptFunction.addToRolePolicy(new PolicyStatement({
    actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
    ],
    resources: [
        'arn:aws:bedrock:*::foundation-model/amazon.nova-2-lite-v1:0',
        'arn:aws:bedrock:*::foundation-model/us.amazon.nova-2-lite-v1:0',
        `arn:aws:bedrock:*:${Stack.of(apiStack).account}:inference-profile/amazon.nova-2-lite-v1:0`,
        `arn:aws:bedrock:*:${Stack.of(apiStack).account}:inference-profile/us.amazon.nova-2-lite-v1:0`,
    ],
}));

// Create a new REST API
const imageGeneratorApi = new RestApi(apiStack, 'ImageGeneratorApi', {
    restApiName: 'imageGeneratorApi',
    deploy: true,
    deployOptions: {
        stageName: 'dev',
    },
    defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
    },
});

// Create Lambda integrations
const generateImageIntegration = new LambdaIntegration(generateImageFunction);
const enhancePromptIntegration = new LambdaIntegration(enhancePromptFunction);

// Add API routes with IAM authorization
const generateImagePath = imageGeneratorApi.root.addResource('generate-image');
generateImagePath.addMethod('POST', generateImageIntegration, {
    authorizationType: AuthorizationType.IAM,
});

const enhancePromptPath = imageGeneratorApi.root.addResource('enhance-prompt');
enhancePromptPath.addMethod('POST', enhancePromptIntegration, {
    authorizationType: AuthorizationType.IAM,
});

// Create IAM policy to allow API access
const apiRestPolicy = new Policy(apiStack, 'RestApiPolicy', {
    statements: [
        new PolicyStatement({
            actions: ['execute-api:Invoke'],
            resources: [
                `${imageGeneratorApi.arnForExecuteApi('*', '/generate-image', 'dev')}`,
                `${imageGeneratorApi.arnForExecuteApi('*', '/enhance-prompt', 'dev')}`,
            ],
        }),
    ],
});

// Attach the policy to the authenticated IAM role
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(
    apiRestPolicy
);

// Add outputs to the configuration file
backend.addOutput({
    custom: {
        API: {
            [imageGeneratorApi.restApiName]: {
                endpoint: imageGeneratorApi.url,
                region: Stack.of(imageGeneratorApi).region,
                apiName: imageGeneratorApi.restApiName,
            },
        },
    },
});