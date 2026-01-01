import { defineFunction } from '@aws-amplify/backend';

export const enhancePrompt = defineFunction({
    name: 'enhancePrompt',
    entry: './handler.ts',
    environment: {
        BEDROCK_REGION: 'us-east-1',
    },
    runtime: 'nodejs18.x',
    timeout: '2 minutes',
});