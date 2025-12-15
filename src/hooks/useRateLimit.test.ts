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

        // Should execute immediately since we're under the limit
        expect(result.current.queueLength).toBe(1);
    });

    it('should queue requests when at rate limit', async () => {
        const { result } = renderHook(() => useRateLimit());

        // Update rate limit to 1 request per minute for testing
        await act(async () => {
            await result.current.updateRateLimit(1);
        });

        const mockExecute1 = vi.fn().mockResolvedValue(undefined);
        const mockExecute2 = vi.fn().mockResolvedValue(undefined);

        // First request should execute immediately
        await act(async () => {
            result.current.queueRequest('test-1', mockExecute1);
        });

        // Second request should be queued
        await act(async () => {
            result.current.queueRequest('test-2', mockExecute2);
        });

        expect(result.current.queueLength).toBe(2); // Both in queue initially
    });

    it('should update rate limit configuration', async () => {
        const { result } = renderHook(() => useRateLimit());

        await act(async () => {
            await result.current.updateRateLimit(50);
        });

        expect(result.current.rateLimitConfig.requestsPerMinute).toBe(50);
    });

    it('should calculate time until next slot correctly', async () => {
        const { result } = renderHook(() => useRateLimit());

        // Set rate limit to 1 request per minute
        await act(async () => {
            await result.current.updateRateLimit(1);
        });

        // Make a request to fill the slot
        const mockExecute = vi.fn().mockResolvedValue(undefined);
        await act(async () => {
            result.current.queueRequest('test-1', mockExecute);
        });

        // Should have time until next slot
        expect(result.current.timeUntilNextSlot).toBeGreaterThan(0);
    });
});