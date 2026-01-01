import { defineBackend } from '@aws-amplify/backend';
import { Duration, Stack } from 'aws-cdk-lib';
import {
    AuthorizationType,
    CognitoUserPoolsAuthorizer,
    Cors,
    LambdaIntegration,
    MockIntegration,
    PassthroughBehavior,
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

// Create a new API stack for REST API and Lambda functions
const apiStack = backend.createStack('api-stack');

// Create Lambda functions using CDK
const generateImageFunction = new lambda.NodejsFunction(apiStack, 'GenerateImageFunction', {
    entry: './amplify/functions/generate-image/handler.ts',
    runtime: Runtime.NODEJS_18_X,
    timeout: Duration.minutes(5),
    environment: {
        BEDROCK_REGION: 'us-east-1',
    },
});

const enhancePromptFunction = new lambda.NodejsFunction(apiStack, 'EnhancePromptFunction', {
    entry: './amplify/functions/enhance-prompt/handler.ts',
    runtime: Runtime.NODEJS_18_X,
    timeout: Duration.minutes(2),
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
        'arn:aws:bedrock:us-east-1::foundation-model/us.amazon.nova-2-omni-v1:0',
    ],
}));

enhancePromptFunction.addToRolePolicy(new PolicyStatement({
    actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
    ],
    resources: [
        'arn:aws:bedrock:us-east-1::foundation-model/us.amazon.nova-2-lite-v1:0',
    ],
}));

// Create a new REST API
const imageGeneratorApi = new RestApi(apiStack, 'ImageGeneratorApi', {
    restApiName: 'imageGeneratorApi',
    deploy: true,
    deployOptions: {
        stageName: 'dev',
    },
    // Remove defaultCorsPreflightOptions since we're handling CORS manually
});

// Create Lambda integrations
const generateImageIntegration = new LambdaIntegration(generateImageFunction);
const enhancePromptIntegration = new LambdaIntegration(enhancePromptFunction);

// Add API routes WITHOUT Cognito authorization for testing
const generateImagePath = imageGeneratorApi.root.addResource('generate-image');
generateImagePath.addMethod('POST', generateImageIntegration, {
    authorizationType: AuthorizationType.NONE, // Temporarily remove auth
});

// Add explicit OPTIONS method with mock integration (no auth required)
const optionsIntegration = new MockIntegration({
    integrationResponses: [{
        statusCode: '200',
        responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Amzn-Trace-Id'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST'",
            'method.response.header.Access-Control-Allow-Credentials': "'true'",
        },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
        'application/json': '{"statusCode": 200}',
    },
});

generateImagePath.addMethod('OPTIONS', optionsIntegration, {
    authorizationType: AuthorizationType.NONE,
    methodResponses: [{
        statusCode: '200',
        responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
        },
    }],
});

const enhancePromptPath = imageGeneratorApi.root.addResource('enhance-prompt');
enhancePromptPath.addMethod('POST', enhancePromptIntegration, {
    authorizationType: AuthorizationType.NONE, // Temporarily remove auth
});

enhancePromptPath.addMethod('OPTIONS', optionsIntegration, {
    authorizationType: AuthorizationType.NONE,
    methodResponses: [{
        statusCode: '200',
        responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
        },
    }],
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