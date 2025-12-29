import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { PromptEnhancement } from '../types';
import { personaService } from './personaService';
import { processPromptTemplate } from '@/utils/promptTemplating';

/**
 * Configuration for PromptEnhancementService
 */
export interface ServiceConfig {
    region: string;
    credentials: AwsCredentialIdentity;
}

/**
 * Error handling configuration for prompt enhancement
 */
interface ErrorConfig {
    maxRetries: number;
    timeoutMs: number;
    fallbackToOriginal: boolean;
}

/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_CONFIG: ErrorConfig = {
    maxRetries: 2,
    timeoutMs: 30000, // 30 seconds
    fallbackToOriginal: true
};

/**
 * Service class for prompt enhancement using Amazon Bedrock's Nova 2 Omni model
 * via the non-streaming Converse API for immediate response.
 */
export class PromptEnhancementService {
    private client: BedrockRuntimeClient;
    private readonly modelId = 'us.amazon.nova-2-omni-v1:0';
    private errorConfig: ErrorConfig;

    /**
     * Creates a new PromptEnhancementService instance
     * @param config - Configuration object containing AWS region and credentials
     * @param errorConfig - Optional error handling configuration
     */
    constructor(config: ServiceConfig, errorConfig?: Partial<ErrorConfig>) {
        this.client = new BedrockRuntimeClient({
            region: config.region,
            credentials: config.credentials,
        });
        this.errorConfig = { ...DEFAULT_ERROR_CONFIG, ...errorConfig };
    }

    /**
     * Enhances a user prompt using the non-streaming Converse API
     * Returns the enhanced prompt immediately when complete
     * 
     * @param originalPrompt - The original user prompt to enhance
     * @param personaId - The type of enhancement to apply
     * @returns Promise<string> - The enhanced prompt or original prompt on error
     */
    async enhancePrompt(
        originalPrompt: string,
        personaId: PromptEnhancement
    ): Promise<string> {
        try {
            // Return original prompt if enhancement is off
            if (personaId === 'off') {
                return originalPrompt;
            }

            let retryCount = 0;
            let lastError: unknown = null;

            // Retry loop for handling transient errors
            while (retryCount <= this.errorConfig.maxRetries) {
                try {
                    const enhancedPrompt = await this.attemptEnhancement(
                        originalPrompt,
                        personaId
                    );

                    // Validate we received meaningful content
                    if (!enhancedPrompt || enhancedPrompt.trim().length < 3) {
                        throw new Error('Received empty or insufficient enhancement content');
                    }

                    return enhancedPrompt.trim();
                } catch (error) {
                    console.error('Bedrock Converse API Exception:', {
                        error,
                        stack: error instanceof Error ? error.stack : undefined,
                        message: error instanceof Error ? error.message : String(error),
                        name: (error as any)?.name,
                        metadata: (error as any)?.$metadata,
                        timestamp: new Date().toISOString(),
                        service: 'PromptEnhancementService',
                        retryCount,
                        originalPrompt: originalPrompt.substring(0, 100) + '...' // Truncate for logging
                    });

                    lastError = error;
                    retryCount++;

                    // If we've exhausted retries, break out
                    if (retryCount > this.errorConfig.maxRetries) {
                        break;
                    }

                    // Wait before retry (exponential backoff)
                    const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                    await this.sleep(backoffMs);
                }
            }

            // All retries failed, handle fallback
            if (this.errorConfig.fallbackToOriginal) {
                console.warn('Prompt enhancement failed, falling back to original prompt:', lastError);
                return originalPrompt;
            } else {
                throw lastError;
            }
        } catch (error) {
            console.error('Prompt Enhancement Service Exception:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                service: 'PromptEnhancementService',
                context: 'enhancePrompt'
            });

            // Fallback to original prompt on any unexpected error
            if (this.errorConfig.fallbackToOriginal) {
                return originalPrompt;
            } else {
                throw error;
            }
        }
    }

    /**
     * Attempts prompt enhancement using the Converse API
     */
    private async attemptEnhancement(
        originalPrompt: string,
        personaId: PromptEnhancement
    ): Promise<string> {
        // Get system prompt based on enhancement type
        let systemPrompt = await personaService.getSystemPrompt(personaId);
        if (!systemPrompt) {
            throw new Error('Unable to get system prompt for persona');
        }

        // Process any template variables in the system prompt
        systemPrompt = processPromptTemplate(systemPrompt);

        // Build the command parameters
        const commandParams: any = {
            modelId: this.modelId,
            messages: [
                {
                    role: 'user',
                    content: [{ text: originalPrompt }],
                },
            ],
            system: [
                {
                    text: systemPrompt
                }
            ],
            inferenceConfig: {
                temperature: 1.0
            }
        };

        console.log('Sending command to Bedrock:', commandParams);

        const command = new ConverseCommand(commandParams);

        // Create abort controller for timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            abortController.abort();
        }, this.errorConfig.timeoutMs);

        try {
            // Send the request
            const response = await this.client.send(command, {
                abortSignal: abortController.signal
            });

            // Clear timeout
            clearTimeout(timeoutId);

            // Extract the response text
            if (!response.output?.message?.content?.[0]?.text) {
                throw new Error('No text content received from Bedrock API');
            }

            return response.output.message.content[0].text;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}