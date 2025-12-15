import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { sqliteService } from '@/services/sqliteService';

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
    requestsPerMinute: number;
}

/**
 * Request queue item
 */
interface QueuedRequest {
    id: string;
    execute: () => Promise<void>;
    timestamp: number;
}

/**
 * Rate limiting hook that manages request queuing and execution
 * Ensures requests don't exceed the configured rate limit
 */
export function useRateLimit() {
    const [rateLimitConfig, setRateLimitConfig] = useState<RateLimitConfig>({ requestsPerMinute: 20 });
    const [queue, setQueue] = useState<QueuedRequest[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);

    const processingRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const queueRef = useRef<QueuedRequest[]>([]);
    const timestampsRef = useRef<number[]>([]);

    // Keep refs in sync with state
    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    useEffect(() => {
        timestampsRef.current = requestTimestamps;
    }, [requestTimestamps]);

    // Periodic cleanup of old timestamps
    // Keep only the last few timestamps since we only need the most recent one for delay calculation
    useEffect(() => {
        const cleanup = setInterval(() => {
            setRequestTimestamps(prev => {
                // Keep only the last 10 timestamps to prevent memory leaks
                // We only need the most recent one for delay calculation, but keeping a few more for safety
                if (prev.length > 10) {
                    const sorted = [...prev].sort((a, b) => b - a); // Sort descending (newest first)
                    const kept = sorted.slice(0, 10);
                    console.log(`Cleaned up ${prev.length - kept.length} old timestamps, kept ${kept.length}`);
                    return kept;
                }
                return prev;
            });
        }, 30000); // Clean up every 30 seconds

        return () => clearInterval(cleanup);
    }, []);

    // Load rate limit setting from database
    useEffect(() => {
        const loadRateLimit = async () => {
            try {
                const savedRateLimit = await sqliteService.getSetting('rateLimitRequestsPerMinute');
                if (savedRateLimit && typeof savedRateLimit === 'number') {
                    setRateLimitConfig({ requestsPerMinute: savedRateLimit });
                }
            } catch (error) {
                console.error('Failed to load rate limit setting:', error);
            }
        };
        loadRateLimit();
    }, []);

    // Save rate limit setting to database
    const updateRateLimit = useCallback(async (requestsPerMinute: number) => {
        try {
            await sqliteService.setSetting('rateLimitRequestsPerMinute', requestsPerMinute);
            setRateLimitConfig({ requestsPerMinute });
        } catch (error) {
            console.error('Failed to save rate limit setting:', error);
        }
    }, []);



    // Calculate minimum delay between requests based on rate limit
    const getMinimumDelayBetweenRequests = useCallback(() => {
        // Convert requests per minute to milliseconds between requests
        // 60000ms / requestsPerMinute = minimum delay in ms
        return Math.ceil(60000 / rateLimitConfig.requestsPerMinute);
    }, [rateLimitConfig.requestsPerMinute]);

    // Helper function to check if we can make a request at a given time
    const canMakeRequestAt = useCallback((timestamps: number[], checkTime: number = Date.now()) => {
        if (timestamps.length === 0) {
            return true; // No previous requests, can make request
        }

        const lastRequestTime = Math.max(...timestamps);
        const minimumDelay = getMinimumDelayBetweenRequests();
        const timeSinceLastRequest = checkTime - lastRequestTime;
        const canMake = timeSinceLastRequest >= minimumDelay;

        console.log(`Rate limit check: Last request ${timeSinceLastRequest}ms ago, minimum delay ${minimumDelay}ms. Can make request: ${canMake}`);
        return canMake;
    }, [getMinimumDelayBetweenRequests]);

    // Helper function to calculate time until next available slot
    const calculateTimeUntilNextSlot = useCallback((timestamps: number[], checkTime: number = Date.now()) => {
        if (timestamps.length === 0) {
            return 0; // No previous requests, can make request now
        }

        const lastRequestTime = Math.max(...timestamps);
        const minimumDelay = getMinimumDelayBetweenRequests();
        const timeSinceLastRequest = checkTime - lastRequestTime;

        if (timeSinceLastRequest >= minimumDelay) {
            return 0; // Can make request now
        }

        // Calculate remaining time to wait
        const timeUntilNextSlot = minimumDelay - timeSinceLastRequest;
        return Math.max(0, timeUntilNextSlot);
    }, [getMinimumDelayBetweenRequests]);

    // Current state values (for external consumption)
    const canMakeRequestNow = useMemo(() => {
        return canMakeRequestAt(requestTimestamps);
    }, [requestTimestamps, canMakeRequestAt]);

    const getTimeUntilNextSlot = useCallback(() => {
        return calculateTimeUntilNextSlot(requestTimestamps);
    }, [requestTimestamps, calculateTimeUntilNextSlot]);

    // Process the queue
    const processQueue = useCallback(async () => {
        if (processingRef.current) return;

        processingRef.current = true;
        setIsProcessing(true);

        try {
            while (true) {
                // Get current state from refs (always up-to-date)
                const currentQueue = queueRef.current;
                const currentTimestamps = timestampsRef.current;

                if (currentQueue.length === 0) break;

                const now = Date.now();

                // Check if we can make a request with current timestamps
                if (!canMakeRequestAt(currentTimestamps, now)) {
                    const waitTime = calculateTimeUntilNextSlot(currentTimestamps, now);
                    if (waitTime > 0) {
                        console.log(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
                        // Wait until we can make the next request
                        await new Promise(resolve => {
                            timeoutRef.current = setTimeout(resolve, waitTime);
                        });
                        continue; // Re-check after waiting
                    }
                }

                // Get the next request from the queue
                const nextRequest = currentQueue[0];
                if (!nextRequest) break;

                // Remove from queue and record timestamp atomically
                setQueue(prev => prev.slice(1));
                setRequestTimestamps(prev => [...prev, now]);

                console.log(`Executing request ${nextRequest.id} at ${new Date(now).toISOString()}`);

                // Execute the request
                try {
                    await nextRequest.execute();
                } catch (error) {
                    console.error('Error executing queued request:', error);
                }

                // Small delay to prevent overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } finally {
            processingRef.current = false;
            setIsProcessing(false);
        }
    }, [canMakeRequestAt, calculateTimeUntilNextSlot]);

    // Start processing when queue changes
    useEffect(() => {
        if (queue.length > 0 && !processingRef.current) {
            processQueue();
        }
    }, [queue, processQueue]);

    // Add a request to the queue
    const queueRequest = useCallback((id: string, execute: () => Promise<void>) => {
        const request: QueuedRequest = {
            id,
            execute,
            timestamp: Date.now(),
        };

        console.log(`Queueing request ${id}. Current queue length: ${queue.length}`);
        setQueue(prev => [...prev, request]);
    }, [queue.length]);

    // Remove a request from the queue (for cancellation)
    const removeFromQueue = useCallback((id: string) => {
        setQueue(prev => prev.filter(request => request.id !== id));
    }, []);

    // Get queue position for a request
    const getQueuePosition = useCallback((id: string) => {
        return queue.findIndex(request => request.id === id);
    }, [queue]);

    // Record a request timestamp (for immediate executions)
    const recordRequest = useCallback((id: string) => {
        const now = Date.now();
        console.log(`Recording timestamp for immediate execution: ${id} at ${new Date(now).toISOString()}`);
        setRequestTimestamps(prev => [...prev, now]);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        rateLimitConfig,
        updateRateLimit,
        queueRequest,
        removeFromQueue,
        getQueuePosition,
        recordRequest,
        canMakeRequest: canMakeRequestNow,
        timeUntilNextSlot: getTimeUntilNextSlot(),
        queueLength: queue.length,
        isProcessing,
    };
}