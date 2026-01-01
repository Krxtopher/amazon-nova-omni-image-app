import { defineFunction } from '@aws-amplify/backend';

export const generateImage = defineFunction({
    name: 'generateImage',
    entry: './handler.ts',
    environment: {
        BEDROCK_REGION: 'us-east-1',
    },
    runtime: 'nodejs18.x',
    timeout: '5 minutes',
});