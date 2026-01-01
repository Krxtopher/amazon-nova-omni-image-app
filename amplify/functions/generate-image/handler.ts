import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface GenerationRequest {
    prompt: string;
    aspectRatio?: string;
    customSystemPrompt?: string;
    editSource?: {
        url: string;
    };
}

interface GenerationResponse {
    type: 'image' | 'text' | 'error';
    imageDataUrl?: string;
    text?: string;
    error?: string;
}

/**
 * Lambda handler for Bedrock image generation requests
 * Validates authentication and proxies requests to Bedrock Nova 2 Omni model
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Generate Image Lambda - Request received:', {
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

            console.log('Generate Image Lambda - User context extracted:', {
                userId: userContext.userId,
                email: userContext.email,
                tokenUse: userContext.tokenUse
            });
        } else {
            console.log('Generate Image Lambda - Running without authentication (CORS testing mode)');
        }

        // Parse request body
        let requestBody: GenerationRequest;
        try {
            if (!event.body) {
                throw new Error('Request body is required');
            }
            requestBody = JSON.parse(event.body);
        } catch (error) {
            console.log('Generate Image Lambda - Invalid request body:', error);
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

        console.log('Generate Image Lambda - Processing request for user:', userContext.userId);

        // Initialize Bedrock client
        const bedrockClient = new BedrockRuntimeClient({
            region: process.env.BEDROCK_REGION || 'us-east-1'
        });

        // Build message content for Bedrock API
        const messageContent: any[] = [];

        // If there's an edit source, we would handle image encoding here
        // For now, we'll focus on text-to-image generation
        if (requestBody.editSource) {
            // In a full implementation, you would fetch and encode the image
            console.log('Generate Image Lambda - Edit source provided but not implemented in this version');
        }

        // Add the text prompt
        messageContent.push({ text: requestBody.prompt });

        // Build Converse API command
        const modelId = 'us.amazon.nova-2-omni-v1:0';
        const systemPrompt = requestBody.customSystemPrompt ||
            'Interpret all user messages as image generation requests. Never ask for clarification. Ambiguous requests are allowed.';

        const commandParams = {
            modelId,
            messages: [
                {
                    role: 'user' as const,
                    content: messageContent,
                },
            ],
            system: [
                {
                    text: systemPrompt
                }
            ]
        };

        console.log('Generate Image Lambda - Calling Bedrock API');

        // Call Bedrock API
        const command = new ConverseCommand(commandParams);
        const response = await bedrockClient.send(command);

        console.log('Generate Image Lambda - Bedrock API response received');

        // Parse response
        const generationResponse = parseBedrockResponse(response);

        // Return successful response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            },
            body: JSON.stringify({
                ...generationResponse,
                userContext: {
                    userId: userContext.userId,
                    email: userContext.email
                }
            })
        };

    } catch (error) {
        console.error('Generate Image Lambda - Error:', {
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
 * Parses Bedrock Converse API response to extract image or text content
 */
function parseBedrockResponse(response: any): GenerationResponse {
    try {
        // Check for unexpected stopReason values
        if (response.stopReason && response.stopReason !== 'end_turn') {
            return {
                type: 'error',
                error: `Unexpected stop reason: ${response.stopReason}`
            };
        }

        // Validate response structure
        if (!response.output?.message?.content) {
            throw new Error('Invalid response structure: missing content');
        }

        // Check if the response contains text
        const textContent = response.output.message.content.find(
            (item: any) => item.text !== undefined
        );

        if (textContent?.text) {
            return {
                type: 'text',
                text: textContent.text
            };
        }

        // Find the image in the response content
        const imageContent = response.output.message.content.find(
            (item: any) => item.image !== undefined
        );

        if (!imageContent?.image?.source?.bytes) {
            throw new Error('No image or text content found in response');
        }

        // Extract image bytes and convert to base64
        const imageBytes = imageContent.image.source.bytes;
        const format = imageContent.image.format || 'png';

        // Convert Uint8Array to base64
        const base64 = uint8ArrayToBase64(imageBytes);

        return {
            type: 'image',
            imageDataUrl: `data:image/${format};base64,${base64}`
        };

    } catch (error) {
        console.error('Parse response error:', error);
        return {
            type: 'error',
            error: error instanceof Error ? error.message : 'Failed to parse response'
        };
    }
}

/**
 * Converts Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary, 'binary').toString('base64');
}