# Email Domain Configuration Guide

This guide explains how to configure email domain restrictions for the AWS Amplify Image Generator application.

## Overview

The application supports configurable email domain restrictions to control which users can register for accounts. This is useful for organizations that want to limit access to employees or specific partner organizations.

## Configuration Methods

### Method 1: Code Configuration (Recommended for Development)

Edit the configuration in `amplify/config/domain-restrictions.ts`:

```typescript
export const domainRestrictionConfig: DomainRestrictionConfig = {
  enabled: true,
  allowedDomains: ['@yourcompany.com', '@partner.com'],
  errorMessage: 'Registration is restricted to company employees and partners.'
};
```

### Method 2: Environment Variables (Recommended for Production)

Set the following environment variables in your deployment:

- `DOMAIN_RESTRICTIONS_ENABLED`: Set to `'true'` to enable restrictions, `'false'` to disable
- `ALLOWED_DOMAINS`: Comma-separated list of allowed domains (e.g., `'@company.com,@partner.com'`)
- `DOMAIN_RESTRICTION_ERROR_MESSAGE`: Custom error message for rejected registrations

## Configuration Examples

### Single Organization
```typescript
{
  enabled: true,
  allowedDomains: ['@amazon.com'],
  errorMessage: 'Registration is restricted to Amazon employees.'
}
```

### Multiple Organizations
```typescript
{
  enabled: true,
  allowedDomains: ['@amazon.com', '@aws.amazon.com', '@a2z.com'],
  errorMessage: 'Registration is restricted to Amazon family companies.'
}
```

### No Restrictions (Open Registration)
```typescript
{
  enabled: false,
  allowedDomains: [], // Ignored when disabled
  errorMessage: undefined // Ignored when disabled
}
```

## Environment Variable Examples

### Production with Multiple Domains
```bash
DOMAIN_RESTRICTIONS_ENABLED=true
ALLOWED_DOMAINS=@company.com,@subsidiary.com,@partner.org
DOMAIN_RESTRICTION_ERROR_MESSAGE=Registration is limited to approved organizations.
```

### Development with Open Registration
```bash
DOMAIN_RESTRICTIONS_ENABLED=false
```

## Deployment Instructions

### For AWS Amplify Hosting

1. **Via Amplify Console:**
   - Go to your app in the AWS Amplify Console
   - Navigate to "Environment variables" in the left sidebar
   - Add the environment variables listed above
   - Redeploy your application

2. **Via AWS CLI:**
   ```bash
   aws amplify update-app --app-id YOUR_APP_ID --environment-variables DOMAIN_RESTRICTIONS_ENABLED=true,ALLOWED_DOMAINS=@yourcompany.com
   ```

### For Local Development

Create a `.env.local` file in your project root:
```bash
DOMAIN_RESTRICTIONS_ENABLED=true
ALLOWED_DOMAINS=@yourcompany.com,@partner.com
DOMAIN_RESTRICTION_ERROR_MESSAGE=Custom error message
```

## Testing Configuration Changes

After updating the configuration:

1. **Test Valid Domains:**
   - Try registering with an email from an allowed domain
   - Registration should succeed

2. **Test Invalid Domains:**
   - Try registering with an email from a non-allowed domain
   - Registration should fail with your configured error message

3. **Test Disabled Restrictions:**
   - Set `DOMAIN_RESTRICTIONS_ENABLED=false`
   - Try registering with any email domain
   - Registration should succeed regardless of domain

## Troubleshooting

### Common Issues

1. **Configuration Not Taking Effect:**
   - Ensure you've redeployed after changing environment variables
   - Check that environment variables are properly set in your deployment environment
   - Verify the Lambda function has been updated with new environment variables

2. **All Registrations Failing:**
   - Check that `ALLOWED_DOMAINS` includes the `@` symbol (e.g., `@company.com`, not `company.com`)
   - Verify domains are comma-separated without spaces
   - Ensure `DOMAIN_RESTRICTIONS_ENABLED` is set to `'true'` (string, not boolean)

3. **Restrictions Not Working:**
   - Verify `DOMAIN_RESTRICTIONS_ENABLED` is set to `'true'`
   - Check that the email domain validator Lambda function is properly configured
   - Review CloudWatch logs for the email domain validator function

### Debugging

Check the Lambda function logs in CloudWatch:
1. Go to AWS CloudWatch Console
2. Navigate to "Log groups"
3. Find the log group for your email domain validator function
4. Review recent log entries for validation attempts

## Security Considerations

- Domain restrictions are enforced at registration time only
- Existing users are not affected by configuration changes
- Consider implementing additional security measures for sensitive applications
- Regularly review and update allowed domains as organizational needs change

## Support

For additional help with domain configuration:
1. Review the AWS Amplify documentation
2. Check the application's GitHub repository for issues and discussions
3. Contact your system administrator or development team