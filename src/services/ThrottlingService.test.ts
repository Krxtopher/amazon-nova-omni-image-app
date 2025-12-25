import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThrottlingService } from './ThrottlingService';
import type { ThrottlingConfig } from '../types/throttling';

describe('ThrottlingService', () => {
    let service: ThrottlingService;

    const testConfig: ThrottlingConfig = {
        globalEnabled: true,
        models: {
            'test-model': {
                maxRequestsPerMinute: 2,
                enabled: true,
            },
        },
    };

    beforeEach(() => {
        // Reset singleton
        (ThrottlingService as any).instance = null;
        service = ThrottlingService.getInstance(testConfig);
    });

    afterEach(() => {
        service.destroy();
    });

    it('should execute requests immediately when throttling is disabled', async () => {
        const disabledConfig: ThrottlingConfig = {
            globalEnabled: false,
            models: {
                'test-model': {
                    maxRequestsPerMinute: 1,
                    enabled: true,
                },
            },
        };

        service.updateConfig(disabledConfig);

        const mockRequest = vi.fn().mockResolvedValue('result');
        const result = await service.queueRequest('test-model', mockRequest);

        expect(result).toBe('result');
        expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should provide accurate statistics', () => {
        const stats = service.getStats();

        expect(stats.models['test-model']).toBeDefined();
        expect(stats.models['test-model'].maxRequestsPerMinute).toBe(2);
        expect(stats.models['test-model'].queuedRequests).toBe(0);
        expect(stats.totalQueuedRequests).toBe(0);
    });

    it('should update configuration correctly', () => {
        const newConfig: ThrottlingConfig = {
            globalEnabled: true,
            models: {
                'test-model': {
                    maxRequestsPerMinute: 5,
                    enabled: true,
                },
                'new-model': {
                    maxRequestsPerMinute: 3,
                    enabled: true,
                },
            },
        };

        service.updateConfig(newConfig);
        const updatedConfig = service.getConfig();

        expect(updatedConfig.models['test-model'].maxRequestsPerMinute).toBe(5);
        expect(updatedConfig.models['new-model']).toBeDefined();
    });
});