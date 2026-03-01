import { fetchAuthSession } from 'aws-amplify/auth';
import { post } from 'aws-amplify/api';
import type { GenerationRequest, GenerationResponse, AspectRatio, AppError } from '../types';

/**
 * Response shape from the Lambda function.
 * The Lambda writes images to S3 and returns a key instead of image data.
 */
interface LambdaImageResponse {
    type: 'image';
    s3Key: string;
    imageId: string;
    format: string;
    width: number;
    height: number;
}

interface LambdaTextResponse {
    type: 'text';
    text: string;
}

interface LambdaErrorResponse {
    type: 'error';
    error: string;
}

type LambdaResponse = LambdaImageResponse | LambdaTextResponse | LambdaErrorResponse;

/**
 * Service for calling Amplify Lambda functions for image generation and prompt enhancement
 * Replaces direct Bedrock calls with authenticated Lambda API calls
 */
export class AmplifyLambdaService {

    constructor() {
        // No need for baseUrl - we'll use Amplify's REST API calling mechanism
    }

    /**
     * Gets the current authentication token for API calls
     */
    private async getAuthToken(): Promise<string> {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            return token;
        } catch (error) {
            console.error('Failed to get auth token:', error);
            throw new Error('Authentication required. Please sign in.');
        }
    }

    /**
     * Makes an authenticated API call to a Lambda function using Amplify's REST API
     * For CORS testing, we'll temporarily skip authentication
     */
    private async callLambdaFunction<T>(
        path: string,
        payload: any
    ): Promise<T> {
        try {
            // For CORS testing, skip auth token validation
            // await this.getAuthToken();

            // Use Amplify's REST API calling mechanism
            const restOperation = post({
                apiName: 'imageGeneratorApi',
                path: path,
                options: {
                    body: payload,
                }
            });

            const response = await restOperation.response;
            const data = await response.body.json();

            return data as T;
        } catch (error) {
            console.error(`Lambda function call failed (${path}):`, error);
            throw this.handleApiError(error);
        }
    }

    /**
     * Generates content using the Lambda image generation function.
     * The Lambda writes images to S3 and returns an s3Key.
     * We translate that into a GenerationResponse the rest of the app understands.
     */
    async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
        try {
            // Get the Cognito Identity Pool identity ID so the Lambda writes to the
            // correct S3 path. Amplify Storage access rules resolve {entity_id} to
            // this identity ID, NOT the User Pool sub.
            let identityId: string | undefined;
            try {
                const session = await fetchAuthSession();
                identityId = session.identityId;
            } catch {
                // If we can't get the identity, the Lambda will use a fallback path
            }

            const payload = {
                prompt: request.prompt,
                aspectRatio: request.aspectRatio,
                customSystemPrompt: request.customSystemPrompt,
                identityId,
                editSource: request.editSource ? {
                    url: request.editSource.url
                } : undefined
            };

            const response = await this.callLambdaFunction<LambdaResponse>(
                'generate-image',
                payload
            );

            // Translate Lambda response to GenerationResponse
            if (response.type === 'image') {
                // Lambda wrote the image to S3 — return the s3Key so the frontend
                // can skip the upload step and just create the metadata record.
                return {
                    type: 'image',
                    s3Key: response.s3Key,
                    imageId: response.imageId,
                    format: response.format,
                    width: response.width,
                    height: response.height,
                } as any; // Extended GenerationResponse with s3Key
            } else if (response.type === 'text') {
                return { type: 'text', text: response.text } as any;
            } else {
                return { type: 'error', error: response.error } as any;
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Enhances a prompt using the Lambda prompt enhancement function
     */
    async enhancePrompt(
        prompt: string,
        persona?: { name: string; description: string; promptTemplate: string }
    ): Promise<{ enhancedPrompt: string; originalPrompt: string }> {
        try {
            const payload = {
                prompt,
                persona: persona ? {
                    name: persona.name,
                    description: persona.description,
                    promptTemplate: persona.promptTemplate
                } : undefined
            };

            const response = await this.callLambdaFunction<{
                enhancedPrompt: string;
                originalPrompt: string;
                userContext?: any;
            }>('enhance-prompt', payload);

            return {
                enhancedPrompt: response.enhancedPrompt,
                originalPrompt: response.originalPrompt
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generates a persona name using the Lambda image generation function
     * This reuses the image generation endpoint with a specific prompt
     */
    async generatePersonaName(personaDescription: string): Promise<string> {
        try {
            const systemPrompt = `Are an expert in artistic style categorization. You have vast knowledge of mainstream as well as very niche styles and substyles. Your task is categorize a style based on a description of the style and/or the artist.
            
## Guidelines:
- The style name you provide should be distinct.
- The style name you provide should be limited 1-4 words long.
- Avoid mentioning artists by name and instead name their style.
- Always return a single style name as plain text. No formatting.
- The style should use Title Case.`;

            const userPrompt = `Artist Persona Description: ${personaDescription}\nStyle Name: `;

            const response = await this.generateContent({
                prompt: userPrompt,
                customSystemPrompt: systemPrompt
            });

            if (response.type === 'text' && response.text) {
                return response.text.trim();
            } else if (response.type === 'error') {
                throw new Error(response.error || 'Failed to generate persona name');
            } else {
                throw new Error('Unexpected response type for persona name generation');
            }
        } catch (error) {
            console.error('Persona name generation failed:', error);
            throw new Error('Failed to generate persona name. Please try again.');
        }
    }

    /**
     * Generates a persona icon using the Lambda image generation function
     * This reuses the image generation endpoint with a specific prompt
     */
    async generatePersonaIcon(personaDescription: string): Promise<string> {
        try {
            const systemPrompt = `You are an expert in visual iconography and UI design. Your task is to select the most appropriate Lucide React icon name based on a persona description.

## Available Icon Categories:
- Art & Design: Palette, Brush, Pen, PenTool, Paintbrush, Image, Camera, Aperture, Focus
- Nature: Flower, Tree, Sun, Moon, Star, Cloud, Mountain, Waves, Leaf
- Abstract: Sparkles, Zap, Flame, Heart, Diamond, Circle, Square, Triangle
- Tools: Wrench, Hammer, Scissors, Ruler, Compass, Gear, Settings
- Creative: Wand2, Magic, Lightbulb, Eye, Target, Crown, Gem
- Technology: Monitor, Smartphone, Tablet, Headphones, Mic, Radio
- Music: Music, Volume2, Play, Pause, SkipForward, Repeat
- Animals: Cat, Dog, Bird, Fish, Butterfly, Rabbit, Owl
- Objects: Book, Feather, Key, Lock, Gift, Trophy, Medal
- Emotions: Smile, Frown, Meh, Laugh, Heart, ThumbsUp

## Guidelines:
- Choose ONE icon name that best represents the persona's style or characteristics
- Return ONLY the exact Lucide React icon name (e.g., "Palette", "Sparkles", "Camera")
- Consider the artistic style, mood, and creative focus described
- Prefer creative and artistic icons for artistic personas
- Use abstract icons for conceptual or emotional styles
- Match the icon to the dominant theme or tool associated with the style
- Return ONLY the icon name with no quotes, asterisks, or other formatting
- Do not include explanations, descriptions, or additional text`;

            const userPrompt = `Persona Description: ${personaDescription}\nIcon Name: `;

            const response = await this.generateContent({
                prompt: userPrompt,
                customSystemPrompt: systemPrompt
            });

            if (response.type === 'text' && response.text) {
                // Clean up the response to extract just the icon name
                let iconName = response.text.trim();

                // Remove any markdown formatting (**, *, etc.)
                iconName = iconName.replace(/\*+/g, '');

                // Remove any extra whitespace
                iconName = iconName.trim();

                // If the response contains multiple words or lines, take the first word
                iconName = iconName.split(/\s+/)[0];

                return iconName;
            } else if (response.type === 'error') {
                throw new Error(response.error || 'Failed to generate persona icon');
            } else {
                throw new Error('Unexpected response type for persona icon generation');
            }
        } catch (error) {
            console.error('Persona icon generation failed:', error);
            throw new Error('Failed to generate persona icon. Please try again.');
        }
    }

    /**
     * Gets the model ID being used for image generation
     * Returns the model ID used by the Lambda function
     */
    getModelId(): string {
        return 'us.amazon.nova-2-omni-v1:0';
    }

    /**
     * Gets the configured AWS region
     * Returns the region used by the Lambda functions
     */
    async getRegion(): Promise<string> {
        return 'us-east-1'; // This would come from Amplify configuration
    }

    /**
     * Converts an aspect ratio to its corresponding dimensions
     * This is kept for compatibility with existing code
     */
    getDimensionsForAspectRatio(ratio: Exclude<AspectRatio, 'random'>): { width: number; height: number } {
        const ASPECT_RATIO_DIMENSIONS: Record<Exclude<AspectRatio, 'random'>, { width: number; height: number }> = {
            '2:1': { width: 1536, height: 768 },
            '16:9': { width: 1344, height: 768 },
            '3:2': { width: 1152, height: 768 },
            '4:3': { width: 1152, height: 896 },
            '1:1': { width: 1024, height: 1024 },
            '3:4': { width: 896, height: 1152 },
            '2:3': { width: 768, height: 1152 },
            '9:16': { width: 768, height: 1344 },
            '1:2': { width: 768, height: 1536 },
        };

        return ASPECT_RATIO_DIMENSIONS[ratio];
    }

    /**
     * Handles API errors and converts them to AppError format
     */
    private handleApiError(error: unknown): AppError {
        if (error instanceof Error) {
            // Check for specific error patterns
            if (error.message.includes('Authentication required')) {
                return {
                    message: 'Authentication required. Please sign in.',
                    category: 'api',
                    retryable: false,
                    originalError: error,
                };
            }

            if (error.message.includes('HTTP 429')) {
                return {
                    message: 'Too many requests. Please wait a moment and try again.',
                    category: 'api',
                    retryable: true,
                    originalError: error,
                };
            }

            if (error.message.includes('HTTP 503')) {
                return {
                    message: 'Service temporarily unavailable. Please try again later.',
                    category: 'api',
                    retryable: true,
                    originalError: error,
                };
            }

            if (error.message.includes('HTTP 400')) {
                return {
                    message: `Invalid request: ${error.message}`,
                    category: 'validation',
                    retryable: false,
                    originalError: error,
                };
            }

            if (error.message.includes('fetch')) {
                return {
                    message: 'Network error. Please check your connection and try again.',
                    category: 'network',
                    retryable: true,
                    originalError: error,
                };
            }
        }

        // Generic error
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return {
            message: errorMessage,
            category: 'client',
            retryable: false,
            originalError: error,
        };
    }

    /**
     * Handles and categorizes errors from the API calls
     */
    private handleError(error: unknown): AppError {
        console.error('Lambda API Exception:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            service: 'AmplifyLambdaService'
        });

        return this.handleApiError(error);
    }
}

// Export singleton instance
export const amplifyLambdaService = new AmplifyLambdaService();