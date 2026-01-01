import { defineFunction } from '@aws-amplify/backend';

export const generateImage = defineFunction({
    entry: './handler.ts',
    environment: {
        BEDROCK_REGION: 'us-east-1',
    },
    timeoutSeconds: 300,
});