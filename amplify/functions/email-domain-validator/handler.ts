import type { PreSignUpTriggerHandler } from 'aws-lambda';
import { validateEmailDomain, getDomainValidationErrorMessage } from '../../config/domain-restrictions';

export const handler: PreSignUpTriggerHandler = async (event) => {
    const { email } = event.request.userAttributes;

    // Validate email domain using the configurable system
    const isValidDomain = validateEmailDomain(email);

    if (!isValidDomain) {
        throw new Error(getDomainValidationErrorMessage());
    }

    // If validation passes, return the event unchanged
    return event;
};