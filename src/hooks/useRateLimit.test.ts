import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useRateLimit } from './useRateLimit';

// Mock the sqliteService
vi.mock('@/services/sqliteService', () => ({
    sqliteService: {
        getSetting: vi.fn().mockResolvedValue(null),
        setSetting: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('useRateLimit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with default rate limit', async () => {
        const { result } = renderHook(() => useRateLimit());

        expect(result.current.rateLimitConfig.requestsPerMinute).toBe(20);
        expect(result.current.canMakeRequest).toBe(true);
        expect(result.current.queueLength).toBe(0);
    });

    it('should allow requests when under rate limit', async () => {
        const { result } = renderHook(() => useRateLimit());

        expect(result.current.canMakeRequest).toBe(true);

        // Queue a request
        const mockExecute = vi.fn().mockResolvedValue(undefined);

        await act(async () => {
            result.current.queueRequest('test-1', mockExecute);
        });

        // First request should execute immediately, so queue should be empty after processing
        // But canMakeRequest should be false due to minimum delay
        expect(result.current.canMakeRequest).toBe(false);
    });

    it('should enforce minimum delay between requests', async () => {
        const { result } = renderHook(() => useRateLimit());

        // Update rate limit to 4 requests per minute (15 second intervals)
        await act(async () => {
            await result.current.updateRateLimit(4);
        });

        const mockExecute1 = vi.fn().mockResolvedValue(undefined);
        const mockExecute2 = vi.fn().mockResolvedValue(undefined);

        // First request should execute immediately
        await act(async () => {
            result.current.queueRequest('test-1', mockExecute1);
        });

        // Immediately after first request, should not be able to make another
        expect(result.current.canMakeRequest).toBe(false);
        expect(result.current.timeUntilNextSlot).toBeGreaterThan(14000); // Should be close to 15 seconds

        // Second request should be queued
        await act(async () => {
            result.current.queueRequest('test-2', mockExecute2);
        });

        expect(result.current.queueLength).toBe(1); // Second request should be queued
    });

    it('should update rate limit configuration', async () => {
        const { result } = renderHook(() => useRateLimit());

        await act(async () => {
            await result.current.updateRateLimit(50);
        });

        expect(result.current.rateLimitConfig.requestsPerMinute).toBe(50);
    });

    it('should calculate time until next slot correctly with minimum delay', async () => {
        const { result } = renderHook(() => useRateLimit());

        // Set rate limit to 1 request per minute (60 second intervals)
        await act(async () => {
            await result.current.updateRateLimit(1);
        });

        // Make a request
        const mockExecute = vi.fn().mockResolvedValue(undefined);
        await act(async () => {
            result.current.queueRequest('test-1', mockExecute);
        });

        // Should have approximately 60 seconds until next slot
        expect(result.current.timeUntilNextSlot).toBeGreaterThan(59000);
        expect(result.current.timeUntilNextSlot).toBeLessThanOrEqual(60000);
    });

    it('should calculate correct minimum delays for different rate limits', async () => {
        const { result } = renderHook(() => useRateLimit());

        // Test 4 requests per minute = 15 second intervals
        await act(async () => {
            await result.current.updateRateLimit(4);
        });

        const mockExecute1 = vi.fn().mockResolvedValue(undefined);
        await act(async () => {
            result.current.queueRequest('test-1', mockExecute1);
        });

        // Should have approximately 15 seconds until next slot
        expect(result.current.timeUntilNextSlot).toBeGreaterThan(14000);
        expect(result.current.timeUntilNextSlot).toBeLessThanOrEqual(15000);

        // Test 6 requests per minute = 10 second intervals
        await act(async () => {
            await result.current.updateRateLimit(6);
        });

        const mockExecute2 = vi.fn().mockResolvedValue(undefined);
        await act(async () => {
            result.current.queueRequest('test-2', mockExecute2);
        });

        // Should have approximately 10 seconds until next slot
        expect(result.current.timeUntilNextSlot).toBeGreaterThan(9000);
        expect(result.current.timeUntilNextSlot).toBeLessThanOrEqual(10000);
    });
});