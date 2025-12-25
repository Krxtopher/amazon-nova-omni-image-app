/**
 * Performance optimization utilities for streaming prompt display
 * 
 * This module provides optimizations for:
 * - Token buffering to prevent UI blocking during rapid streams
 * - Timer pooling for efficient resource usage
 * - RequestAnimationFrame coordination for smooth animations
 * - Memory usage monitoring for concurrent displays
 */

export interface PerformanceMetrics {
    activeTimers: number;
    activeDisplays: number;
    memoryUsage: number;
    averageTokenProcessingTime: number;
}

export interface TokenBuffer {
    tokens: string[];
    lastFlushTime: number;
    isProcessing: boolean;
}

export interface TimerPoolEntry {
    id: string;
    timer: NodeJS.Timeout;
    callback: () => void;
    delay: number;
    createdAt: number;
}

/**
 * Singleton performance optimizer for streaming displays
 */
export class PerformanceOptimizer {
    private static instance: PerformanceOptimizer | null = null;

    // Token buffering
    private tokenBuffers = new Map<string, TokenBuffer>();
    private readonly BUFFER_FLUSH_INTERVAL = 16; // ~60fps
    private readonly MAX_BUFFER_SIZE = 50;
    private bufferFlushTimer: NodeJS.Timeout | null = null;

    // Timer pooling
    private timerPool = new Map<string, TimerPoolEntry>();
    private timerIdCounter = 0;

    // Animation frame coordination
    private animationFrameCallbacks = new Set<() => void>();
    private animationFrameId: number | null = null;

    // Performance monitoring
    private metrics: PerformanceMetrics = {
        activeTimers: 0,
        activeDisplays: 0,
        memoryUsage: 0,
        averageTokenProcessingTime: 0,
    };

    private tokenProcessingTimes: number[] = [];
    private readonly MAX_METRIC_SAMPLES = 100;

    private constructor() {
        this.startBufferFlushLoop();
        this.startMemoryMonitoring();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): PerformanceOptimizer {
        if (!PerformanceOptimizer.instance) {
            PerformanceOptimizer.instance = new PerformanceOptimizer();
        }
        return PerformanceOptimizer.instance;
    }

    /**
     * Buffer tokens to prevent UI blocking during rapid streams
     */
    bufferToken(displayId: string, token: string, onFlush: (tokens: string[]) => void): void {
        const startTime = performance.now();

        if (!this.tokenBuffers.has(displayId)) {
            this.tokenBuffers.set(displayId, {
                tokens: [],
                lastFlushTime: Date.now(),
                isProcessing: false
            });
        }

        const buffer = this.tokenBuffers.get(displayId)!;
        buffer.tokens.push(token);

        // Flush immediately if buffer is full
        if (buffer.tokens.length >= this.MAX_BUFFER_SIZE) {
            this.flushTokenBuffer(displayId, onFlush);
        }

        // Record processing time
        const processingTime = performance.now() - startTime;
        this.recordTokenProcessingTime(processingTime);
    }

    /**
     * Flush token buffer for a specific display
     */
    private flushTokenBuffer(displayId: string, onFlush: (tokens: string[]) => void): void {
        const buffer = this.tokenBuffers.get(displayId);
        if (!buffer || buffer.tokens.length === 0 || buffer.isProcessing) {
            return;
        }

        buffer.isProcessing = true;
        const tokensToFlush = [...buffer.tokens];
        buffer.tokens = [];
        buffer.lastFlushTime = Date.now();

        // Use requestAnimationFrame for smooth processing
        this.scheduleAnimationFrame(() => {
            onFlush(tokensToFlush);
            buffer.isProcessing = false;
        });
    }

    /**
     * Start buffer flush loop
     */
    private startBufferFlushLoop(): void {
        const flushLoop = () => {
            const now = Date.now();

            for (const [_displayId, buffer] of this.tokenBuffers.entries()) {
                // Flush buffers that haven't been flushed recently
                if (buffer.tokens.length > 0 &&
                    now - buffer.lastFlushTime > this.BUFFER_FLUSH_INTERVAL &&
                    !buffer.isProcessing) {

                    // We need the onFlush callback, but it's not available here
                    // This will be handled by the periodic flush in the component
                }
            }

            this.bufferFlushTimer = setTimeout(flushLoop, this.BUFFER_FLUSH_INTERVAL);
        };

        flushLoop();
    }

    /**
     * Clean up token buffer for a display
     */
    cleanupTokenBuffer(displayId: string): void {
        this.tokenBuffers.delete(displayId);
    }

    /**
     * Create a pooled timer with automatic cleanup
     */
    createPooledTimer(callback: () => void, delay: number): string {
        const timerId = `timer_${++this.timerIdCounter}`;

        const wrappedCallback = () => {
            try {
                callback();
            } finally {
                // Clean up timer from pool
                this.removePooledTimer(timerId);
            }
        };

        const timer = setTimeout(wrappedCallback, delay);

        this.timerPool.set(timerId, {
            id: timerId,
            timer,
            callback: wrappedCallback,
            delay,
            createdAt: Date.now()
        });

        this.metrics.activeTimers++;
        return timerId;
    }

    /**
     * Remove a pooled timer
     */
    removePooledTimer(timerId: string): void {
        const entry = this.timerPool.get(timerId);
        if (entry) {
            clearTimeout(entry.timer);
            this.timerPool.delete(timerId);
            this.metrics.activeTimers--;
        }
    }

    /**
     * Clear all pooled timers for cleanup
     */
    clearAllPooledTimers(): void {
        for (const entry of this.timerPool.values()) {
            clearTimeout(entry.timer);
        }
        this.timerPool.clear();
        this.metrics.activeTimers = 0;
    }

    /**
     * Schedule a callback for the next animation frame
     */
    scheduleAnimationFrame(callback: () => void): void {
        this.animationFrameCallbacks.add(callback);

        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(() => {
                const callbacks = Array.from(this.animationFrameCallbacks);
                this.animationFrameCallbacks.clear();
                this.animationFrameId = null;

                // Execute all callbacks
                callbacks.forEach(cb => {
                    try {
                        cb();
                    } catch (error) {
                        console.error('Animation frame callback error:', error);
                    }
                });
            });
        }
    }

    /**
     * Register a new active display
     */
    registerDisplay(_displayId: string): void {
        this.metrics.activeDisplays++;
        // Display registration tracking for performance monitoring
    }

    /**
     * Unregister an active display
     */
    unregisterDisplay(displayId: string): void {
        this.metrics.activeDisplays = Math.max(0, this.metrics.activeDisplays - 1);
        this.cleanupTokenBuffer(displayId);
        // Display cleanup completed
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Record token processing time for metrics
     */
    private recordTokenProcessingTime(time: number): void {
        this.tokenProcessingTimes.push(time);
        if (this.tokenProcessingTimes.length > this.MAX_METRIC_SAMPLES) {
            this.tokenProcessingTimes.shift();
        }

        this.metrics.averageTokenProcessingTime =
            this.tokenProcessingTimes.reduce((a, b) => a + b, 0) / this.tokenProcessingTimes.length;
    }

    /**
     * Record word reveal time for metrics
     */
    /**
     * Start memory usage monitoring
     */
    private startMemoryMonitoring(): void {
        const updateMemoryUsage = () => {
            if ('memory' in performance) {
                const memory = (performance as any).memory;
                this.metrics.memoryUsage = memory.usedJSHeapSize;
            }
        };

        // Update memory usage every 5 seconds
        setInterval(updateMemoryUsage, 5000);
        updateMemoryUsage(); // Initial reading
    }

    /**
     * Clean up all resources
     */
    cleanup(): void {
        // Clear buffer flush timer
        if (this.bufferFlushTimer) {
            clearTimeout(this.bufferFlushTimer);
            this.bufferFlushTimer = null;
        }

        // Clear all pooled timers
        this.clearAllPooledTimers();

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clear buffers
        this.tokenBuffers.clear();
        this.animationFrameCallbacks.clear();

        // Reset metrics
        this.metrics = {
            activeTimers: 0,
            activeDisplays: 0,
            memoryUsage: 0,
            averageTokenProcessingTime: 0,
        };
    }
}

/**
 * Hook for using performance optimizer in React components
 */
export function usePerformanceOptimizer() {
    return PerformanceOptimizer.getInstance();
}