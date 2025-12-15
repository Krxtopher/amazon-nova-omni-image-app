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
    useEffect(() => {
        const cleanup = setInterval(() => {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            setRequestTimestamps(prev => {
                const filtered = prev.filter(timestamp => timestamp > oneMinuteAgo);
                if (filtered.length !== prev.length) {
                    console.log(`Cleaned up ${prev.length - filtered.length} old timestamps`);
                }
                return filtered;
            });
        }, 10000); // Clean up every 10 seconds

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



    // Helper function to check if we can make a request at a given time
    const canMakeRequestAt = useCallback((timestamps: number[], checkTime: number = Date.now()) => {
        const oneMinuteAgo = checkTime - 60000;
        const recentTimestamps = timestamps.filter(timestamp => timestamp > oneMinuteAgo);
        const canMake = recentTimestamps.length < rateLimitConfig.requestsPerMinute;
        console.log(`Rate limit check: ${recentTimestamps.length}/${rateLimitConfig.requestsPerMinute} requests in last minute. Can make request: ${canMake}`);
        return canMake;
    }, [rateLimitConfig.requestsPerMinute]);

    // Helper function to calculate time until next available slot
    const calculateTimeUntilNextSlot = useCallback((timestamps: number[], checkTime: number = Date.now()) => {
        const oneMinuteAgo = checkTime - 60000;
        const recentTimestamps = timestamps.filter(timestamp => timestamp > oneMinuteAgo);

        if (recentTimestamps.length < rateLimitConfig.requestsPerMinute) {
            return 0; // Can make request now
        }

        // Find the oldest timestamp that will expire soonest
        const oldestTimestamp = Math.min(...recentTimestamps);
        const timeUntilSlotFree = (oldestTimestamp + 60000) - checkTime;
        return Math.max(0, timeUntilSlotFree);
    }, [rateLimitConfig.requestsPerMinute]);

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