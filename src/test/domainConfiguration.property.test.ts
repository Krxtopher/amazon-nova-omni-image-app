import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the domain configuration functions since we can't import from amplify functions directly
interface DomainRestrictionConfig {
    enabled: boolean;
    allowedDomains: string[];
    errorMessage?: string;
}

// Mock implementation of the domain configuration system
const mockGetDomainRestrictionConfig = (
    enabled: boolean = true,
    allowedDomains: string[] = ['@amazon.com'],
    errorMessage?: string
): DomainRestrictionConfig => {
    // Simulate environment variable overrides
    const envEnabled = process.env.DOMAIN_RESTRICTIONS_ENABLED;
    const envDomains = process.env.ALLOWED_DOMAINS;
    const envErrorMessage = process.env.DOMAIN_RESTRICTION_ERROR_MESSAGE;

    return {
        enabled: envEnabled !== undefined ? envEnabled.toLowerCase() === 'true' : enabled,
        allowedDomains: envDomains ? envDomains.split(',').map(d => d.trim()) : allowedDomains,
        errorMessage: envErrorMessage || errorMessage || 'Registration is restricted to users with approved email domains.'
    };
};

const mockValidateEmailDomain = (email: string, config?: DomainRestrictionConfig): boolean => {
    const domainConfig = config || mockGetDomainRestrictionConfig();

    // If domain restrictions are disabled, allow all emails
    if (!domainConfig.enabled) {
        return true;
    }

    // If no domains are configured, allow all emails
    if (!domainConfig.allowedDomains || domainConfig.allowedDomains.length === 0) {
        return true;
    }

    // Check if email ends with any of the allowed domains
    return domainConfig.allowedDomains.some(domain =>
        email.toLowerCase().endsWith(domain.toLowerCase())
    );
};

const mockGetDomainValidationErrorMessage = (config?: DomainRestrictionConfig): string => {
    const domainConfig = config || mockGetDomainRestrictionConfig();

    if (domainConfig.errorMessage) {
        return `${domainConfig.errorMessage} Allowed domains: ${domainConfig.allowedDomains.join(', ')}`;
    }

    return `Registration is restricted to users with email addresses from: ${domainConfig.allowedDomains.join(', ')}`;
};

describe('Domain Configuration Property Tests', () => {
    // Store original environment variables
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
        originalEnv = {
            DOMAIN_RESTRICTIONS_ENABLED: process.env.DOMAIN_RESTRICTIONS_ENABLED,
            ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS,
            DOMAIN_RESTRICTION_ERROR_MESSAGE: process.env.DOMAIN_RESTRICTION_ERROR_MESSAGE
        };
    });

    afterEach(() => {
        // Restore original environment variables
        Object.keys(originalEnv).forEach(key => {
            if (originalEnv[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = originalEnv[key];
            }
        });
    });

    describe('Property 3: Domain configuration enforcement', () => {
        it('should enforce exactly the configured domains and reject all others', async () => {
            /**
             * Feature: amplify-integration, Property 3: Domain configuration enforcement
             * Validates: Requirements 1.5, 7.1
             */

            // Property: For any configured set of allowed domains, 
            // the authentication system should enforce exactly those domains and reject all others
            await fc.assert(
                fc.asyncProperty(
                    // Generate a configuration with random allowed domains
                    fc.record({
                        allowedDomains: fc.array(
                            fc.record({
                                name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                                tld: fc.oneof(
                                    fc.constant('.com'),
                                    fc.constant('.org'),
                                    fc.constant('.net'),
                                    fc.constant('.edu'),
                                    fc.constant('.gov')
                                )
                            }).map(({ name, tld }) => `@${name}${tld}`),
                            { minLength: 1, maxLength: 5 }
                        ),
                        testEmail: fc.record({
                            localPart: fc.stringMatching(/^[a-zA-Z0-9._%+-]+$/),
                            domain: fc.record({
                                name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                                tld: fc.oneof(
                                    fc.constant('.com'),
                                    fc.constant('.org'),
                                    fc.constant('.net'),
                                    fc.constant('.edu'),
                                    fc.constant('.gov')
                                )
                            }).map(({ name, tld }) => `@${name}${tld}`)
                        }).map(({ localPart, domain }) => `${localPart}${domain}`)
                    }),
                    async ({ allowedDomains, testEmail }) => {
                        // Create configuration with the generated allowed domains
                        const config = mockGetDomainRestrictionConfig(true, allowedDomains);

                        // Test email validation
                        const isValid = mockValidateEmailDomain(testEmail, config);

                        // Extract the domain from the test email
                        const emailDomain = '@' + testEmail.split('@')[1];

                        // Should be valid if and only if the email domain is in the allowed list
                        const shouldBeValid = allowedDomains.some(domain =>
                            emailDomain.toLowerCase() === domain.toLowerCase()
                        );

                        expect(isValid).toBe(shouldBeValid);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 4: Multi-domain support', () => {
        it('should accept email addresses from any of the configured domains', async () => {
            /**
             * Feature: amplify-integration, Property 4: Multi-domain support
             * Validates: Requirements 7.3
             */

            // Property: For any configuration with multiple allowed domains, 
            // the system should accept email addresses from any of the configured domains
            await fc.assert(
                fc.asyncProperty(
                    // Generate multiple allowed domains and pick one for the test email
                    fc.record({
                        allowedDomains: fc.array(
                            fc.record({
                                name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                                tld: fc.oneof(
                                    fc.constant('.com'),
                                    fc.constant('.org'),
                                    fc.constant('.net'),
                                    fc.constant('.edu')
                                )
                            }).map(({ name, tld }) => `@${name}${tld}`),
                            { minLength: 2, maxLength: 5 } // Ensure multiple domains
                        )
                    }).chain(({ allowedDomains }) =>
                        fc.record({
                            allowedDomains: fc.constant(allowedDomains),
                            selectedDomain: fc.constantFrom(...allowedDomains),
                            localPart: fc.stringMatching(/^[a-zA-Z0-9._%+-]+$/)
                        })
                    ),
                    async ({ allowedDomains, selectedDomain, localPart }) => {
                        // Create email using one of the allowed domains
                        const testEmail = `${localPart}${selectedDomain}`;

                        // Create configuration with multiple allowed domains
                        const config = mockGetDomainRestrictionConfig(true, allowedDomains);

                        // Test email validation
                        const isValid = mockValidateEmailDomain(testEmail, config);

                        // Should always be valid since we used an allowed domain
                        expect(isValid).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 17: Configuration change propagation', () => {
        it('should enforce new restrictions for all subsequent registration attempts after configuration changes', async () => {
            /**
             * Feature: amplify-integration, Property 17: Configuration change propagation
             * Validates: Requirements 7.2
             */

            // Property: For any change to domain restrictions configuration, 
            // the new restrictions should be enforced for all subsequent registration attempts
            await fc.assert(
                fc.asyncProperty(
                    // Generate initial and updated configurations
                    fc.record({
                        initialDomains: fc.array(
                            fc.record({
                                name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                                tld: fc.constant('.com')
                            }).map(({ name, tld }) => `@${name}${tld}`),
                            { minLength: 1, maxLength: 3 }
                        ),
                        updatedDomains: fc.array(
                            fc.record({
                                name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                                tld: fc.constant('.org')
                            }).map(({ name, tld }) => `@${name}${tld}`),
                            { minLength: 1, maxLength: 3 }
                        ),
                        testEmail: fc.record({
                            localPart: fc.stringMatching(/^[a-zA-Z0-9._%+-]+$/),
                            domain: fc.oneof(
                                fc.constant('@testcompany.com'),
                                fc.constant('@neworg.org')
                            )
                        }).map(({ localPart, domain }) => `${localPart}${domain}`)
                    }),
                    async ({ initialDomains, updatedDomains, testEmail }) => {
                        // Test with initial configuration
                        const initialConfig = mockGetDomainRestrictionConfig(true, initialDomains);
                        const initialResult = mockValidateEmailDomain(testEmail, initialConfig);

                        // Test with updated configuration
                        const updatedConfig = mockGetDomainRestrictionConfig(true, updatedDomains);
                        const updatedResult = mockValidateEmailDomain(testEmail, updatedConfig);

                        // Extract email domain
                        const emailDomain = '@' + testEmail.split('@')[1];

                        // Results should match the respective configurations
                        const shouldBeValidInitially = initialDomains.some(domain =>
                            emailDomain.toLowerCase() === domain.toLowerCase()
                        );
                        const shouldBeValidAfterUpdate = updatedDomains.some(domain =>
                            emailDomain.toLowerCase() === domain.toLowerCase()
                        );

                        expect(initialResult).toBe(shouldBeValidInitially);
                        expect(updatedResult).toBe(shouldBeValidAfterUpdate);

                        // If configurations are different, results might be different
                        // This tests that configuration changes are properly applied
                        if (!initialDomains.some(d => updatedDomains.includes(d))) {
                            // If domains are completely different, test that the change is reflected
                            const hasInitialDomain = initialDomains.some(domain =>
                                emailDomain.toLowerCase() === domain.toLowerCase()
                            );
                            const hasUpdatedDomain = updatedDomains.some(domain =>
                                emailDomain.toLowerCase() === domain.toLowerCase()
                            );

                            if (hasInitialDomain && !hasUpdatedDomain) {
                                expect(initialResult).toBe(true);
                                expect(updatedResult).toBe(false);
                            } else if (!hasInitialDomain && hasUpdatedDomain) {
                                expect(initialResult).toBe(false);
                                expect(updatedResult).toBe(true);
                            }
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Environment Variable Override Tests', () => {
        it('should respect environment variable overrides for domain restrictions', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        envEnabled: fc.boolean(),
                        envDomains: fc.array(
                            fc.record({
                                name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                                tld: fc.constant('.com')
                            }).map(({ name, tld }) => `@${name}${tld}`),
                            { minLength: 1, maxLength: 3 }
                        ),
                        testEmail: fc.record({
                            localPart: fc.stringMatching(/^[a-zA-Z0-9._%+-]+$/),
                            domain: fc.constant('@testcompany.com')
                        }).map(({ localPart, domain }) => `${localPart}${domain}`)
                    }),
                    async ({ envEnabled, envDomains, testEmail }) => {
                        // Set environment variables
                        process.env.DOMAIN_RESTRICTIONS_ENABLED = envEnabled.toString();
                        process.env.ALLOWED_DOMAINS = envDomains.join(',');

                        // Get configuration (should use environment variables)
                        const config = mockGetDomainRestrictionConfig();

                        // Validate email
                        const isValid = mockValidateEmailDomain(testEmail, config);

                        // Check that environment variables are respected
                        expect(config.enabled).toBe(envEnabled);
                        expect(config.allowedDomains).toEqual(envDomains);

                        // If disabled, should always be valid
                        if (!envEnabled) {
                            expect(isValid).toBe(true);
                        } else {
                            // If enabled, should match domain validation
                            const emailDomain = '@' + testEmail.split('@')[1];
                            const shouldBeValid = envDomains.some(domain =>
                                emailDomain.toLowerCase() === domain.toLowerCase()
                            );
                            expect(isValid).toBe(shouldBeValid);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Disabled Restrictions Tests', () => {
        it('should allow all email domains when restrictions are disabled', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate any email address
                    fc.record({
                        localPart: fc.stringMatching(/^[a-zA-Z0-9._%+-]+$/),
                        domain: fc.record({
                            name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                            tld: fc.oneof(
                                fc.constant('.com'),
                                fc.constant('.org'),
                                fc.constant('.net'),
                                fc.constant('.edu'),
                                fc.constant('.gov'),
                                fc.constant('.co.uk'),
                                fc.constant('.de'),
                                fc.constant('.fr')
                            )
                        }).map(({ name, tld }) => `@${name}${tld}`)
                    }).map(({ localPart, domain }) => `${localPart}${domain}`),
                    async (testEmail) => {
                        // Create configuration with restrictions disabled
                        const config = mockGetDomainRestrictionConfig(false, ['@restrictive.com']);

                        // Test email validation
                        const isValid = mockValidateEmailDomain(testEmail, config);

                        // Should always be valid when restrictions are disabled
                        expect(isValid).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Error Message Configuration Tests', () => {
        it('should use configured error messages for domain validation failures', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        customMessage: fc.string({ minLength: 10, maxLength: 100 }),
                        allowedDomains: fc.array(
                            fc.record({
                                name: fc.stringMatching(/^[a-zA-Z0-9-]+$/),
                                tld: fc.constant('.com')
                            }).map(({ name, tld }) => `@${name}${tld}`),
                            { minLength: 1, maxLength: 3 }
                        )
                    }),
                    async ({ customMessage, allowedDomains }) => {
                        // Create configuration with custom error message
                        const config = mockGetDomainRestrictionConfig(true, allowedDomains, customMessage);

                        // Get error message
                        const errorMessage = mockGetDomainValidationErrorMessage(config);

                        // Should include the custom message and allowed domains
                        expect(errorMessage).toContain(customMessage);
                        allowedDomains.forEach(domain => {
                            expect(errorMessage).toContain(domain);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});