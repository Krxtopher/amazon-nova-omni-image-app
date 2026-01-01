import { defineFunction } from '@aws-amplify/backend';

export const emailDomainValidator = defineFunction({
    entry: './handler.ts',
    environment: {
        // Legacy environment variable for backward compatibility
        ALLOWED_DOMAINS: '@amazon.com',
        // New configurable environment variables
        DOMAIN_RESTRICTIONS_ENABLED: 'true',
        DOMAIN_RESTRICTION_ERROR_MESSAGE: 'Registration is restricted to users with approved email domains.',
    },
    timeoutSeconds: 30,
});