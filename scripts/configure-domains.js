#!/usr/bin/env node

/**
 * Domain Configuration Utility
 * 
 * This script helps administrators easily configure email domain restrictions
 * for the AWS Amplify Image Generator application.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE_PATH = path.join(__dirname, '../amplify/config/domain-restrictions.ts');

function showUsage() {
    console.log(`
Domain Configuration Utility

Usage:
  node scripts/configure-domains.js [command] [options]

Commands:
  show                    Show current configuration
  enable                  Enable domain restrictions
  disable                 Disable domain restrictions
  add <domain>           Add an allowed domain (e.g., @company.com)
  remove <domain>        Remove an allowed domain
  set <domains>          Set allowed domains (comma-separated)
  message <text>         Set custom error message

Examples:
  node scripts/configure-domains.js show
  node scripts/configure-domains.js enable
  node scripts/configure-domains.js add @newcompany.com
  node scripts/configure-domains.js set @company.com,@partner.com
  node scripts/configure-domains.js message "Registration restricted to employees"
`);
}

function readConfig() {
    try {
        const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');

        // Extract configuration values using regex
        const enabledMatch = content.match(/enabled:\s*(true|false)/);
        const domainsMatch = content.match(/allowedDomains:\s*\[(.*?)\]/s);
        const messageMatch = content.match(/errorMessage:\s*'([^']*)'|errorMessage:\s*"([^"]*)"/);

        const enabled = enabledMatch ? enabledMatch[1] === 'true' : true;
        const allowedDomains = domainsMatch
            ? domainsMatch[1].split(',').map(d => d.trim().replace(/['"]/g, '')).filter(d => d)
            : ['@amazon.com'];
        const errorMessage = messageMatch ? (messageMatch[1] || messageMatch[2]) : 'Registration is restricted to users with approved email domains.';

        return { enabled, allowedDomains, errorMessage };
    } catch (error) {
        console.error('Error reading configuration:', error.message);
        process.exit(1);
    }
}

function writeConfig(config) {
    const domainsArray = config.allowedDomains.map(d => `'${d}'`).join(', ');

    const newContent = `/**
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
  enabled: ${config.enabled},
  allowedDomains: [${domainsArray}],
  errorMessage: '${config.errorMessage}'
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
    return \`\${config.errorMessage} Allowed domains: \${config.allowedDomains.join(', ')}\`;
  }
  
  return \`Registration is restricted to users with email addresses from: \${config.allowedDomains.join(', ')}\`;
}`;

    try {
        fs.writeFileSync(CONFIG_FILE_PATH, newContent, 'utf8');
        console.log('Configuration updated successfully!');
    } catch (error) {
        console.error('Error writing configuration:', error.message);
        process.exit(1);
    }
}

function showConfig() {
    const config = readConfig();
    console.log('\nCurrent Domain Configuration:');
    console.log('============================');
    console.log(`Enabled: ${config.enabled}`);
    console.log(`Allowed Domains: ${config.allowedDomains.join(', ')}`);
    console.log(`Error Message: ${config.errorMessage}`);
    console.log('');
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showUsage();
        return;
    }

    const command = args[0];
    const config = readConfig();

    switch (command) {
        case 'show':
            showConfig();
            break;

        case 'enable':
            config.enabled = true;
            writeConfig(config);
            console.log('Domain restrictions enabled.');
            break;

        case 'disable':
            config.enabled = false;
            writeConfig(config);
            console.log('Domain restrictions disabled.');
            break;

        case 'add':
            if (args.length < 2) {
                console.error('Error: Please specify a domain to add (e.g., @company.com)');
                process.exit(1);
            }
            const domainToAdd = args[1];
            if (!domainToAdd.startsWith('@')) {
                console.error('Error: Domain must start with @ (e.g., @company.com)');
                process.exit(1);
            }
            if (!config.allowedDomains.includes(domainToAdd)) {
                config.allowedDomains.push(domainToAdd);
                writeConfig(config);
                console.log(`Added domain: ${domainToAdd}`);
            } else {
                console.log(`Domain ${domainToAdd} is already in the allowed list.`);
            }
            break;

        case 'remove':
            if (args.length < 2) {
                console.error('Error: Please specify a domain to remove');
                process.exit(1);
            }
            const domainToRemove = args[1];
            const index = config.allowedDomains.indexOf(domainToRemove);
            if (index > -1) {
                config.allowedDomains.splice(index, 1);
                writeConfig(config);
                console.log(`Removed domain: ${domainToRemove}`);
            } else {
                console.log(`Domain ${domainToRemove} was not found in the allowed list.`);
            }
            break;

        case 'set':
            if (args.length < 2) {
                console.error('Error: Please specify domains to set (comma-separated)');
                process.exit(1);
            }
            const newDomains = args[1].split(',').map(d => d.trim());
            for (const domain of newDomains) {
                if (!domain.startsWith('@')) {
                    console.error(`Error: Domain '${domain}' must start with @ (e.g., @company.com)`);
                    process.exit(1);
                }
            }
            config.allowedDomains = newDomains;
            writeConfig(config);
            console.log(`Set allowed domains to: ${newDomains.join(', ')}`);
            break;

        case 'message':
            if (args.length < 2) {
                console.error('Error: Please specify an error message');
                process.exit(1);
            }
            config.errorMessage = args.slice(1).join(' ');
            writeConfig(config);
            console.log(`Set error message to: ${config.errorMessage}`);
            break;

        default:
            console.error(`Unknown command: ${command}`);
            showUsage();
            process.exit(1);
    }
}

if (require.main === module) {
    main();
}