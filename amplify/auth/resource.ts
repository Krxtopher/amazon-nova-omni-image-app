import { defineAuth } from '@aws-amplify/backend';
import { emailDomainValidator } from '../functions/email-domain-validator/resource';

/**
 * Define and configure the authentication resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
    loginWith: {
        email: {
            verificationEmailStyle: "CODE",
            verificationEmailSubject: "Welcome to Image Generator - Verify your email",
        },
    },
    userAttributes: {
        email: {
            required: true,
        },
    },
    accountRecovery: "EMAIL_ONLY",
    triggers: {
        preSignUp: emailDomainValidator,
    },
});