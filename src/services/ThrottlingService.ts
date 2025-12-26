import type {
    ThrottlingConfig,
    QueuedRequest,
    ModelThrottleStats,
    ThrottlingStats
} from '../types/throttling';
import { DEFAULT_THROTTLING_CONFIG } from '../types/throttling';

/**
 * Service for throttling Bedrock API requests per model
 * 
 * Manages request queues and rate limiting to prevent exceeding
 * AWS Bedrock service limits and avoid throttling errors.
 */
export class ThrottlingService {
    private static instance: ThrottlingService | null = null;

    private config: ThrottlingConfig;
    private queues: Map<string, QueuedRequest[]> = new Map();
    private requestTimestamps: Map<string, number[]> = new Map();
    private processingIntervals: Map<string, NodeJS.Timeout> = new Map();
    private configChangeListeners: Set<(config: ThrottlingConfig) => void> = new Set();

    private constructor(config: ThrottlingConfig) {
        this.config = { ...config };
        this.initializeQueues();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(config?: ThrottlingConfig): ThrottlingService {
        if (!ThrottlingService.instance) {
            ThrottlingService.instance = new ThrottlingService(config || DEFAULT_THROTTLING_CONFIG);
        }
        return ThrottlingService.instance;
    }

    /**
     * Initialize queues and processing intervals for all configured models
     */
    private initializeQueues(): void {
        for (const modelId of Object.keys(this.config.models)) {
            if (!this.queues.has(modelId)) {
                this.queues.set(modelId, []);
                this.requestTimestamps.set(modelId, []);
                this.startProcessingQueue(modelId);
            }
        }
    }

    /**
     * Update throttling configuration
     */
    public updateConfig(newConfig: ThrottlingConfig): void {
        const oldConfig = { ...this.config };
        this.config = { ...newConfig };

        // Initialize queues for new models
        this.initializeQueues();

        // Stop processing for removed models
        for (const modelId of Object.keys(oldConfig.models)) {
            if (!newConfig.models[modelId]) {
                this.stopProcessingQueue(modelId);
                this.queues.delete(modelId);
                this.requestTimestamps.delete(modelId);
            }
        }

        // Notify listeners
        this.configChangeListeners.forEach(listener => listener(newConfig));
    }

    /**
     * Get current configuration
     */
    public getConfig(): ThrottlingConfig {
        return { ...this.config };
    }

    /**
     * Add a configuration change listener
     */
    public onConfigChange(listener: (config: ThrottlingConfig) => void): () => void {
        this.configChangeListeners.add(listener);
        return () => this.configChangeListeners.delete(listener);
    }

    /**
     * Queue a request for execution with throttling
     */
    public async queueRequest<T>(modelId: string, requestExecutor: () => Promise<T>): Promise<T> {
        // If throttling is disabled globally or for this model, execute immediately
        if (!this.config.globalEnabled || !this.config.models[modelId]?.enabled) {
            return requestExecutor();
        }

        // Ensure model is configured
        if (!this.config.models[modelId]) {
            console.warn(`Model ${modelId} not configured for throttling, executing immediately`);
            return requestExecutor();
        }

        return new Promise<T>((resolve, reject) => {
            const request: QueuedRequest<T> = {
                id: `${modelId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                modelId,
                execute: requestExecutor,
                resolve,
                reject,
                queuedAt: Date.now(),
            };

            // Add to queue
            const queue = this.queues.get(modelId) || [];
            queue.push(request);
            this.queues.set(modelId, queue);

            console.log(`Queued request ${request.id} for model ${modelId}. Queue length: ${queue.length}`);
        });
    }

    /**
     * Start processing queue for a specific model
     */
    private startProcessingQueue(modelId: string): void {
        if (this.processingIntervals.has(modelId)) {
            return; // Already processing
        }

        const modelConfig = this.config.models[modelId];
        if (!modelConfig) return;

        // Calculate interval between requests (in milliseconds)
        const intervalMs = (60 * 1000) / modelConfig.maxRequestsPerMinute;

        const interval = setInterval(() => {
            console.log('[Dynamic Interval] ThrottlingService.ts - processNextRequest called for model', modelId, 'at', new Date().toISOString(), 'interval:', intervalMs + 'ms');
            this.processNextRequest(modelId);
        }, intervalMs);

        this.processingIntervals.set(modelId, interval);
        console.log(`Started processing queue for model ${modelId} with interval ${intervalMs}ms`);
    }

    /**
     * Stop processing queue for a specific model
     */
    private stopProcessingQueue(modelId: string): void {
        const interval = this.processingIntervals.get(modelId);
        if (interval) {
            clearInterval(interval);
            this.processingIntervals.delete(modelId);
            console.log(`Stopped processing queue for model ${modelId}`);
        }
    }

    /**
     * Process the next request in queue for a model
     */
    private async processNextRequest(modelId: string): Promise<void> {
        const queue = this.queues.get(modelId);
        if (!queue || queue.length === 0) {
            return; // No requests to process
        }

        const modelConfig = this.config.models[modelId];
        if (!modelConfig || !modelConfig.enabled) {
            return; // Model not configured or disabled
        }

        // Check if we can make a request (within rate limit)
        if (!this.canMakeRequest(modelId)) {
            return; // Rate limit exceeded, wait for next interval
        }

        // Get next request
        const request = queue.shift();
        if (!request) return;

        try {
            console.log(`Processing request ${request.id} for model ${modelId}`);

            // Record request timestamp
            this.recordRequest(modelId);

            // Execute the request
            const result = await request.execute();
            request.resolve(result);

            console.log(`Completed request ${request.id} for model ${modelId}`);
        } catch (error) {
            console.error(`Failed request ${request.id} for model ${modelId}:`, error);
            request.reject(error);
        }
    }

    /**
     * Check if we can make a request for a model (within rate limit)
     */
    private canMakeRequest(modelId: string): boolean {
        const modelConfig = this.config.models[modelId];
        if (!modelConfig) return false;

        const timestamps = this.requestTimestamps.get(modelId) || [];
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;

        // Remove timestamps older than 1 minute
        const recentTimestamps = timestamps.filter(ts => ts > oneMinuteAgo);
        this.requestTimestamps.set(modelId, recentTimestamps);

        // Check if we're under the limit
        return recentTimestamps.length < modelConfig.maxRequestsPerMinute;
    }

    /**
     * Record a request timestamp for rate limiting
     */
    private recordRequest(modelId: string): void {
        const timestamps = this.requestTimestamps.get(modelId) || [];
        timestamps.push(Date.now());
        this.requestTimestamps.set(modelId, timestamps);
    }

    /**
     * Get statistics for all models
     */
    public getStats(): ThrottlingStats {
        const modelStats: Record<string, ModelThrottleStats> = {};
        let totalQueuedRequests = 0;
        let isAnyModelThrottling = false;

        for (const [modelId, modelConfig] of Object.entries(this.config.models)) {
            const queue = this.queues.get(modelId) || [];
            const timestamps = this.requestTimestamps.get(modelId) || [];
            const now = Date.now();
            const oneMinuteAgo = now - 60 * 1000;

            // Count recent requests
            const recentRequests = timestamps.filter(ts => ts > oneMinuteAgo).length;
            const isThrottling = recentRequests >= modelConfig.maxRequestsPerMinute;

            if (isThrottling) {
                isAnyModelThrottling = true;
            }

            // Calculate next available slot
            let nextAvailableSlot: number | undefined;
            if (isThrottling && timestamps.length > 0) {
                const oldestRecentRequest = Math.min(...timestamps.filter(ts => ts > oneMinuteAgo));
                nextAvailableSlot = oldestRecentRequest + 60 * 1000;
            }

            modelStats[modelId] = {
                queuedRequests: queue.length,
                requestsThisMinute: recentRequests,
                maxRequestsPerMinute: modelConfig.maxRequestsPerMinute,
                isThrottling,
                nextAvailableSlot,
            };

            totalQueuedRequests += queue.length;
        }

        return {
            models: modelStats,
            totalQueuedRequests,
            isAnyModelThrottling,
        };
    }

    /**
     * Clear all queues (useful for testing or reset)
     */
    public clearQueues(): void {
        for (const queue of this.queues.values()) {
            // Reject all pending requests
            queue.forEach(request => {
                request.reject(new Error('Queue cleared'));
            });
            queue.length = 0;
        }

        // Clear timestamps
        for (const timestamps of this.requestTimestamps.values()) {
            timestamps.length = 0;
        }
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        // Stop all processing intervals
        for (const interval of this.processingIntervals.values()) {
            clearInterval(interval);
        }
        this.processingIntervals.clear();

        // Clear queues
        this.clearQueues();

        // Clear listeners
        this.configChangeListeners.clear();

        // Reset singleton
        ThrottlingService.instance = null;
    }
}