import { defineFunction } from '@aws-amplify/backend';

export const enhancePrompt = defineFunction({
    entry: './handler.ts',
    environment: {
        BEDROCK_REGION: 'us-east-1',
    },
    timeoutSeconds: 120,
});