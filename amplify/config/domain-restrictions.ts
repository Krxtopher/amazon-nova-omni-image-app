/**
 * Domain Restrictions Configuration
 * 
 * This file defines the email domain restrictions for user registration.
 * Modify this configuration to adapt the system for different organizations.
 */

export interface DomainRestrictionConfig {
    /** Whether domain restrictions are enabled */
    enabled: boolean;
    /** List of allowed email domains (include @ symbol, e.g., '@amazon.com') */
    allowedDomains: string[];
    /** Custom error message when domain validation fails */
    errorMessage?: string;
}

/**
 * Default domain restriction configuration
 * 
 * To customize for your organization:
 * 1. Set enabled to true to enforce domain restrictions
 * 2. Add your organization's domains to allowedDomains array
 * 3. Optionally customize the error message
 * 
 * Examples:
 * - Single domain: ['@amazon.com']
 * - Multiple domains: ['@amazon.com', '@aws.amazon.com', '@a2z.com']
 * - No restrictions: Set enabled to false
 */
export const domainRestrictionConfig: DomainRestrictionConfig = {
    enabled: true,
    allowedDomains: ['@amazon.com'],
    errorMessage: 'Registration is restricted to users with approved email domains.'
};

/**
 * Get the current domain restriction configuration
 * This function allows for runtime configuration overrides via environment variables
 */
export function getDomainRestrictionConfig(): DomainRestrictionConfig {
    // Allow environment variable override for enabled status
    const envEnabled = process.env.DOMAIN_RESTRICTIONS_ENABLED;
    const enabled = envEnabled !== undefined ? envEnabled.toLowerCase() === 'true' : domainRestrictionConfig.enabled;

    // Allow environment variable override for allowed domains
    const envDomains = process.env.ALLOWED_DOMAINS;
    const allowedDomains = envDomains ? envDomains.split(',').map(d => d.trim()) : domainRestrictionConfig.allowedDomains;

    // Allow environment variable override for error message
    const envErrorMessage = process.env.DOMAIN_RESTRICTION_ERROR_MESSAGE;
    const errorMessage = envErrorMessage || domainRestrictionConfig.errorMessage;

    return {
        enabled,
        allowedDomains,
        errorMessage
    };
}

/**
 * Validate an email address against the current domain restrictions
 * @param email The email address to validate
 * @returns true if the email is allowed, false otherwise
 */
export function validateEmailDomain(email: string): boolean {
    const config = getDomainRestrictionConfig();

    // If domain restrictions are disabled, allow all emails
    if (!config.enabled) {
        return true;
    }

    // If no domains are configured, allow all emails
    if (!config.allowedDomains || config.allowedDomains.length === 0) {
        return true;
    }

    // Check if email ends with any of the allowed domains
    return config.allowedDomains.some(domain =>
        email.toLowerCase().endsWith(domain.toLowerCase())
    );
}

/**
 * Get the error message for domain validation failures
 * @returns The configured error message with domain list
 */
export function getDomainValidationErrorMessage(): string {
    const config = getDomainRestrictionConfig();

    if (config.errorMessage) {
        return `${config.errorMessage} Allowed domains: ${config.allowedDomains.join(', ')}`;
    }

    return `Registration is restricted to users with email addresses from: ${config.allowedDomains.join(', ')}`;
}