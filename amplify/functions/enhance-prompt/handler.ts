import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface PromptEnhancementRequest {
    prompt: string;
    persona?: {
        name: string;
        description: string;
        promptTemplate: string;
    };
}

interface PromptEnhancementResponse {
    enhancedPrompt: string;
    originalPrompt: string;
}

/**
 * Lambda handler for Bedrock prompt enhancement requests
 * Validates authentication and proxies requests to Bedrock Nova 2 Lite model
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Enhance Prompt Lambda - Request received:', {
        httpMethod: event.httpMethod,
        path: event.path,
        headers: event.headers,
        timestamp: new Date().toISOString(),
        corsFixed: true // Added to force redeploy
    });

    // CORS headers for all responses
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
    };

    try {
        // Handle preflight OPTIONS request
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: ''
            };
        }

        // Validate HTTP method
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({
                    error: 'Method not allowed. Use POST.'
                })
            };
        }

        // Extract user context if available (when using Cognito authorizer)
        // For now, we're running without authentication for CORS testing
        let userContext = {
            userId: 'anonymous',
            email: 'test@example.com',
            tokenUse: 'access'
        };

        // If Cognito authorizer is enabled, extract user information from request context
        if (event.requestContext.authorizer?.claims) {
            const claims = event.requestContext.authorizer.claims;
            userContext = {
                userId: claims.sub || claims['cognito:username'],
                email: claims.email,
                tokenUse: claims.token_use
            };

            console.log('Enhance Prompt Lambda - User context extracted:', {
                userId: userContext.userId,
                email: userContext.email,
                tokenUse: userContext.tokenUse
            });
        } else {
            console.log('Enhance Prompt Lambda - Running without authentication (CORS testing mode)');
        }

        // Parse request body
        let requestBody: PromptEnhancementRequest;
        try {
            if (!event.body) {
                throw new Error('Request body is required');
            }
            requestBody = JSON.parse(event.body);
        } catch (error) {
            console.log('Enhance Prompt Lambda - Invalid request body:', error);
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({
                    error: 'Invalid JSON in request body'
                })
            };
        }

        // Validate required fields
        if (!requestBody.prompt || typeof requestBody.prompt !== 'string') {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({
                    error: 'Missing or invalid prompt field'
                })
            };
        }

        console.log('Enhance Prompt Lambda - Processing request for user:', userContext.userId);

        // Initialize Bedrock client
        const bedrockClient = new BedrockRuntimeClient({
            region: process.env.BEDROCK_REGION || 'us-east-1'
        });

        // Build the enhancement prompt
        let enhancementPrompt = requestBody.prompt;

        // If a persona is provided, apply the persona template
        if (requestBody.persona && requestBody.persona.promptTemplate) {
            // Replace placeholder in persona template with the user's prompt
            enhancementPrompt = requestBody.persona.promptTemplate.replace('{prompt}', requestBody.prompt);
        }

        // System prompt for enhancement
        const systemPrompt = `You are an expert prompt engineer specializing in image generation prompts. Your task is to enhance user prompts to create more detailed, vivid, and effective prompts for AI image generation.

Guidelines:
- Preserve the core intent and subject matter of the original prompt
- Add relevant artistic details, lighting, composition, and style elements
- Include technical photography or art terms when appropriate
- Make the prompt more specific and descriptive
- Ensure the enhanced prompt is clear and well-structured
- Keep the enhanced prompt concise but detailed (aim for 1-3 sentences)
- Do not change the fundamental subject or concept
- Return only the enhanced prompt, no explanations or additional text`;

        const userPrompt = `Original prompt: "${enhancementPrompt}"

Enhanced prompt:`;

        // Build Converse API command
        const modelId = 'us.amazon.nova-2-lite-v1:0';
        const commandParams = {
            modelId,
            messages: [
                {
                    role: 'user' as const,
                    content: [{ text: userPrompt }],
                },
            ],
            system: [
                {
                    text: systemPrompt
                }
            ],
            inferenceConfig: {
                temperature: 0.7,
                topP: 0.9
            }
        };

        console.log('Enhance Prompt Lambda - Calling Bedrock API');

        // Call Bedrock API
        const command = new ConverseCommand(commandParams);
        const response = await bedrockClient.send(command);

        console.log('Enhance Prompt Lambda - Bedrock API response received');

        // Parse response
        const enhancedPrompt = parseEnhancementResponse(response);

        // Return successful response
        const responseData: PromptEnhancementResponse = {
            enhancedPrompt,
            originalPrompt: requestBody.prompt
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            },
            body: JSON.stringify({
                ...responseData,
                userContext: {
                    userId: userContext.userId,
                    email: userContext.email
                }
            })
        };

    } catch (error) {
        console.error('Enhance Prompt Lambda - Error:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });

        // Handle different types of errors
        let statusCode = 500;
        let errorMessage = 'Internal server error';

        if (error && typeof error === 'object' && 'name' in error) {
            const awsError = error as { name: string; message: string; $metadata?: { httpStatusCode?: number } };

            if (awsError.name === 'ThrottlingException' || awsError.$metadata?.httpStatusCode === 429) {
                statusCode = 429;
                errorMessage = 'Too many requests. Please wait and try again.';
            } else if (awsError.name === 'ValidationException' || awsError.$metadata?.httpStatusCode === 400) {
                statusCode = 400;
                errorMessage = `Invalid request: ${awsError.message}`;
            } else if (awsError.name === 'ServiceUnavailableException' || awsError.$metadata?.httpStatusCode === 503) {
                statusCode = 503;
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            }
        }

        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            },
            body: JSON.stringify({
                error: errorMessage
            })
        };
    }
};

/**
 * Parses Bedrock Converse API response to extract enhanced prompt text
 */
function parseEnhancementResponse(response: any): string {
    try {
        // Validate response structure
        if (!response.output?.message?.content) {
            throw new Error('Invalid response structure: missing content');
        }

        // Find the text content in the response
        const textContent = response.output.message.content.find(
            (item: any) => item.text !== undefined
        );

        if (!textContent?.text) {
            throw new Error('No text content found in response');
        }

        // Return the enhanced prompt, trimmed of any extra whitespace
        return textContent.text.trim();

    } catch (error) {
        console.error('Parse enhancement response error:', error);
        throw new Error('Failed to parse enhancement response');
    }
}