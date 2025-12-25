/**
 * Throttling configuration and types for Bedrock API requests
 */

/**
 * Configuration for throttling a specific model
 */
export interface ModelThrottleConfig {
    /** Maximum requests per minute for this model */
    maxRequestsPerMinute: number;
    /** Whether throttling is enabled for this model */
    enabled: boolean;
}

/**
 * Complete throttling configuration for all models
 */
export interface ThrottlingConfig {
    /** Configuration for each model ID */
    models: Record<string, ModelThrottleConfig>;
    /** Global throttling enabled/disabled */
    globalEnabled: boolean;
}

/**
 * A queued request waiting to be processed
 */
export interface QueuedRequest<T = any> {
    /** Unique identifier for this request */
    id: string;
    /** The model ID this request is for */
    modelId: string;
    /** Function to execute the actual request */
    execute: () => Promise<T>;
    /** Promise resolve function */
    resolve: (value: T) => void;
    /** Promise reject function */
    reject: (error: any) => void;
    /** Timestamp when request was queued */
    queuedAt: number;
}

/**
 * Statistics for a model's throttling
 */
export interface ModelThrottleStats {
    /** Number of requests currently queued */
    queuedRequests: number;
    /** Number of requests processed in current minute */
    requestsThisMinute: number;
    /** Maximum requests allowed per minute */
    maxRequestsPerMinute: number;
    /** Whether throttling is active */
    isThrottling: boolean;
    /** Next available slot timestamp */
    nextAvailableSlot?: number;
}

/**
 * Overall throttling statistics
 */
export interface ThrottlingStats {
    /** Stats per model */
    models: Record<string, ModelThrottleStats>;
    /** Total queued requests across all models */
    totalQueuedRequests: number;
    /** Whether any model is currently throttling */
    isAnyModelThrottling: boolean;
}

/**
 * Default throttling configuration
 */
export const DEFAULT_THROTTLING_CONFIG: ThrottlingConfig = {
    globalEnabled: true,
    models: {
        'us.amazon.nova-2-omni-v1:0': {
            maxRequestsPerMinute: 10,
            enabled: true,
        },
        'us.amazon.nova-2-lite-v1:0': {
            maxRequestsPerMinute: 20,
            enabled: true,
        },
    },
};