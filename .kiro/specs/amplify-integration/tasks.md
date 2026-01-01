# Implementation Plan: AWS Amplify Integration

## Overview

This implementation plan transforms the existing client-side image generation application into a full-stack, multi-user application using AWS Amplify Gen 2. The tasks are organized to build incrementally, starting with core infrastructure, then authentication, followed by data storage, and finally integration with existing features.

## Tasks

- [x] 1. Initialize Amplify Gen 2 backend infrastructure
  - Install Amplify Gen 2 dependencies and CLI tools
  - Create initial backend configuration with auth, data, and storage resources
  - Set up development environment and sandbox
  - _Requirements: 6.4, 6.5_

- [x] 2. Implement authentication system
  - [x] 2.1 Configure Cognito authentication with email domain restrictions
    - Set up Cognito user pool with email-based authentication
    - Configure email domain validation for "@amazon.com" addresses
    - _Requirements: 1.2, 1.3, 1.5, 7.1_

  - [x] 2.2 Write property test for email domain validation
    - **Property 1: Email domain validation**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Write property test for valid domain acceptance
    - **Property 2: Valid domain acceptance**
    - **Validates: Requirements 1.3**

  - [x] 2.4 Integrate Amplify Authenticator in React frontend
    - Install @aws-amplify/ui-react and configure Authenticator component
    - Wrap application with authentication requirements
    - _Requirements: 1.1, 1.4, 1.6_

  - [x] 2.5 Write unit tests for authentication flow
    - Test unauthenticated redirect behavior
    - Test successful login and logout flows
    - _Requirements: 1.1, 1.4, 1.6_

- [x] 3. Set up data models and database
  - [x] 3.1 Define DynamoDB schema for ImageMetadata and PersonaData
    - Create Amplify data models with user isolation (owner-based authorization)
    - Configure proper field types and validation rules
    - _Requirements: 3.1, 3.3, 5.1_

  - [x] 3.2 Write property test for user-scoped metadata storage
    - **Property 7: User-scoped metadata storage**
    - **Validates: Requirements 3.1, 3.2, 3.5**

  - [x] 3.3 Write property test for metadata completeness
    - **Property 8: Metadata completeness**
    - **Validates: Requirements 3.3**

  - [x] 3.4 Implement data access layer
    - Create TypeScript interfaces and API client functions
    - Implement CRUD operations for ImageMetadata and PersonaData
    - _Requirements: 3.2, 5.2, 5.3_

  - [x] 3.5 Write property tests for data isolation
    - **Property 14: User-scoped persona storage**
    - **Validates: Requirements 5.1, 5.5**

- [ ] 4. Configure S3 storage with user isolation
  - [ ] 4.1 Set up Amplify Storage with user-based folder structure
    - Configure S3 bucket with proper access controls
    - Implement user-specific folder organization (images/{user_id}/*)
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 4.2 Write property test for user-segmented S3 storage
    - **Property 10: User-segmented S3 storage**
    - **Validates: Requirements 4.1, 4.2**

  - [ ] 4.3 Implement secure image upload and access
    - Create functions for uploading images to user-specific S3 folders
    - Implement secure URL generation with time-limited access
    - _Requirements: 4.3_

  - [ ] 4.4 Write property test for secure URL generation
    - **Property 11: Secure URL generation**
    - **Validates: Requirements 4.3**

  - [ ] 4.5 Write property test for S3 access control isolation
    - **Property 13: S3 access control isolation**
    - **Validates: Requirements 4.5**

- [ ] 5. Create Lambda functions for Bedrock API proxying
  - [ ] 5.1 Implement image generation Lambda function
    - Create Lambda function to proxy Bedrock image generation requests
    - Add authentication token validation and user context extraction
    - Configure proper IAM roles and Bedrock permissions
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 5.2 Write property test for authentication context propagation
    - **Property 5: Authentication context propagation**
    - **Validates: Requirements 2.1, 2.2**

  - [ ] 5.3 Implement prompt enhancement Lambda function
    - Create Lambda function to proxy Bedrock prompt enhancement requests
    - Add same authentication and security measures as image generation
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 5.4 Write property test for token validation consistency
    - **Property 6: Token validation consistency**
    - **Validates: Requirements 2.2**

  - [ ] 5.5 Add error handling for unauthenticated requests
    - Implement proper error responses for invalid/missing authentication
    - _Requirements: 2.5_

  - [ ] 5.6 Write unit test for unauthenticated request rejection
    - Test that unauthenticated requests are properly rejected
    - _Requirements: 2.5_

- [ ] 6. Update existing services to use Amplify backend
  - [ ] 6.1 Modify BedrockImageService to use Lambda APIs
    - Replace direct Bedrock calls with Lambda function invocations
    - Update error handling for new API structure
    - _Requirements: 2.1, 2.4_

  - [ ] 6.2 Update image storage to use Amplify S3
    - Modify image upload/download logic to use Amplify Storage APIs
    - Implement proper user-scoped file organization
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 6.3 Update persona management to use cloud storage
    - Modify PersonaService to save/load from DynamoDB via Amplify Data
    - Migrate existing persona logic to cloud-based storage
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.4 Write property tests for persona management
    - **Property 15: Persona update consistency**
    - **Property 16: Persona deletion consistency**
    - **Validates: Requirements 5.3, 5.4**

- [ ] 7. Implement metadata tracking and management
  - [ ] 7.1 Add image metadata storage on generation
    - Store complete metadata (prompt, parameters, S3 key) when images are created
    - Link metadata to authenticated user automatically
    - _Requirements: 3.1, 3.3_

  - [ ] 7.2 Implement image deletion with cleanup
    - Delete both S3 objects and DynamoDB metadata when users delete images
    - Ensure complete cleanup across all storage systems
    - _Requirements: 3.4, 4.4_

  - [ ] 7.3 Write property tests for deletion consistency
    - **Property 9: Metadata deletion consistency**
    - **Property 12: S3 deletion consistency**
    - **Validates: Requirements 3.4, 4.4**

  - [ ] 7.4 Update gallery to load from cloud storage
    - Modify GalleryGrid to load images from user's S3 folder via metadata queries
    - Implement proper pagination and loading states
    - _Requirements: 3.2, 4.3_

- [ ] 8. Configure domain restrictions and deployment
  - [ ] 8.1 Implement configurable email domain restrictions
    - Create configuration system for allowed email domains
    - Make "@amazon.com" restriction easily configurable for other organizations
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 8.2 Write property tests for domain configuration
    - **Property 3: Domain configuration enforcement**
    - **Property 4: Multi-domain support**
    - **Property 17: Configuration change propagation**
    - **Validates: Requirements 1.5, 7.1, 7.2, 7.3**

  - [ ] 8.3 Set up Amplify hosting and CI/CD
    - Configure Amplify hosting for the React application
    - Set up automatic deployment from main branch
    - Configure environment variables and build settings
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 9. Checkpoint - End-to-end testing and validation
  - Ensure all authentication flows work correctly
  - Verify user isolation across all features (images, personas, metadata)
  - Test complete image generation and storage workflow
  - Validate error handling and edge cases
  - Ask the user if questions arise

- [ ] 10. Performance optimization and monitoring
  - [ ] 10.1 Implement caching and performance optimizations
    - Add appropriate caching for frequently accessed data
    - Optimize S3 access patterns and Lambda cold starts
    - _Requirements: Performance considerations_

  - [ ] 10.2 Write integration tests for complete workflows
    - Test end-to-end user registration and image generation
    - Test multi-user scenarios and data isolation
    - _Requirements: All requirements integration_

  - [ ] 10.3 Add monitoring and logging
    - Configure CloudWatch logging for Lambda functions
    - Set up monitoring dashboards for key metrics
    - _Requirements: Operational requirements_

- [ ] 11. Final checkpoint - Production readiness
  - Ensure all tests pass and system is stable
  - Verify security configurations and access controls
  - Confirm all requirements are met and documented
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation from the start
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and error conditions
- The implementation follows AWS Amplify Gen 2 best practices throughout