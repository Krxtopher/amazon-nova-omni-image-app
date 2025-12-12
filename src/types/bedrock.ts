/**
 * Converse API message content for image generation
 */
export interface ConverseMessageContent {
    text?: string;
    image?: {
        format: 'png' | 'jpeg' | 'gif' | 'webp';
        source: {
            bytes: Uint8Array;
        };
    };
}

/**
 * Converse API message structure
 */
export interface ConverseMessage {
    role: 'user' | 'assistant';
    content: ConverseMessageContent[];
}

/**
 * Converse API response structure (simplified)
 */
export interface ConverseResponse {
    output: {
        message: {
            role: string;
            content: Array<{
                text?: string;
                image?: {
                    format: string;
                    source: {
                        bytes: Uint8Array;
                    };
                };
            }>;
        };
    };
    stopReason?: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}
