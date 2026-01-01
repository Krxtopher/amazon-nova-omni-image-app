import type { PreSignUpTriggerHandler } from 'aws-lambda';

export const handler: PreSignUpTriggerHandler = async (event) => {
    const { email } = event.request.userAttributes;
    const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || ['@amazon.com'];

    // Check if email ends with any of the allowed domains
    const isValidDomain = allowedDomains.some(domain =>
        email.toLowerCase().endsWith(domain.toLowerCase())
    );

    if (!isValidDomain) {
        throw new Error(`Registration is restricted to users with email addresses from: ${allowedDomains.join(', ')}`);
    }

    // If validation passes, return the event unchanged
    return event;
};