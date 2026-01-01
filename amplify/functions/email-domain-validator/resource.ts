import { defineFunction } from '@aws-amplify/backend';

export const emailDomainValidator = defineFunction({
    name: 'emailDomainValidator',
    entry: './handler.ts',
    environment: {
        ALLOWED_DOMAINS: '@amazon.com',
    },
    runtime: 'nodejs18.x',
    timeout: '30 seconds',
});