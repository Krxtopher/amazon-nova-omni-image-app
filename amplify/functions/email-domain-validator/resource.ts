import { defineFunction } from '@aws-amplify/backend';

export const emailDomainValidator = defineFunction({
    name: 'emailDomainValidator',
    entry: './handler.ts',
    environment: {
        // Legacy environment variable for backward compatibility
        ALLOWED_DOMAINS: '@amazon.com',
        // New configurable environment variables
        DOMAIN_RESTRICTIONS_ENABLED: 'true',
        DOMAIN_RESTRICTION_ERROR_MESSAGE: 'Registration is restricted to users with approved email domains.',
    },
    runtime: 'nodejs18.x',
    timeout: '30 seconds',
});