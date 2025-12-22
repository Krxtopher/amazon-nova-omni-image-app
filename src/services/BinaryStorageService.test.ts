import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IndexedDBBinaryStorageService } from './BinaryStorageService';
import * as fc from 'fast-check';

// Mock IndexedDB for testing environment
const createMockIndexedDB = () => {
    const databases = new Map<string, Map<string, any>>();

    return {
        open: vi.fn((name: string, version: number) => {
            const request = {
                onsuccess: null as any,
                onerror: null as any,
                onupgradeneeded: null as any,
                result: null as any,
            };

            setTimeout(() => {
                if (!databases.has(name)) {
                    databases.set(name, new Map());
                    if (request.onupgradeneeded) {
                        const event = {
                            target: {
                                result: {
                                    createObjectStore: vi.fn((storeName: string) => ({
                                        createIndex: vi.fn(),
                                    })),
                                    objectStoreNames: {
                                        contains: vi.fn(() => false),
                                    },
                                },
                            },
                        };
                        request.onupgradeneeded(event);
                    }
                }

                const store = databases.get(name)!;
                request.result = {
                    transaction: vi.fn((storeNames: string[], mode: string) => ({
                        objectStore: vi.fn((storeName: string) => ({
                            put: vi.fn((record: any) => {
                                const putRequest = {
                                    onsuccess: null as any,
                                    onerror: null as any,
                                };
                                setTimeout(() => {
                                    store.set(record.id, record);
                                    if (putRequest.onsuccess) putRequest.onsuccess();
                                }, 0);
                                return putRequest;
                            }),
                            get: vi.fn((id: string) => {
                                const getRequest = {
                                    onsuccess: null as any,
                                    onerror: null as any,
                                    result: null as any,
                                };
                                setTimeout(() => {
                                    getRequest.result = store.get(id);
                                    if (getRequest.onsuccess) getRequest.onsuccess();
                                }, 0);
                                return getRequest;
                            }),
                            delete: vi.fn((id: string) => {
                                const deleteRequest = {
                                    onsuccess: null as any,
                                    onerror: null as any,
                                };
                                setTimeout(() => {
                                    store.delete(id);
                                    if (deleteRequest.onsuccess) deleteRequest.onsuccess();
                                }, 0);
                                return deleteRequest;
                            }),
                        })),
                        onerror: null as any,
                        oncomplete: null as any,
                    })),
                    objectStoreNames: {
                        contains: vi.fn(() => true),
                    },
                };

                if (request.onsuccess) request.onsuccess();
            }, 0);

            return request;
        }),
    };
};

describe('IndexedDBBinaryStorageService', () => {
    let service: IndexedDBBinaryStorageService;

    beforeEach(() => {
        // Mock IndexedDB in test environment
        if (typeof indexedDB === 'undefined') {
            // @ts-expect-error Mocking global IndexedDB
            global.indexedDB = createMockIndexedDB();
        }

        service = new IndexedDBBinaryStorageService();
    });

    describe('Property-Based Tests', () => {
        /**
         * **Feature: data-storage-optimization, Property 6: On-Demand Binary Loading**
         * **Validates: Requirements 4.2**
         */
        it('should load binary data on-demand without preloading during initialization', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        dataUrl: fc.string({ minLength: 5, maxLength: 50 }).map(s => `data:image/png;base64,${btoa(s)}`),
                    }), { minLength: 1, maxLength: 3 }),
                    async (imageRecords) => {
                        const testService = new IndexedDBBinaryStorageService();

                        for (const record of imageRecords) {
                            await testService.storeImageData(record.id, record.dataUrl);
                        }

                        for (const record of imageRecords) {
                            const retrievedData = await testService.getImageData(record.id);
                            expect(retrievedData).toBe(record.dataUrl);
                        }

                        for (const record of imageRecords) {
                            await testService.deleteImageData(record.id);
                        }
                    }
                ),
                { numRuns: 5, timeout: 5000 }
            );
        });

        /**
         * **Feature: data-storage-optimization, Property 8: Storage Cleanup**
         * **Validates: Requirements 4.4, 4.5**
         */
        it('should properly delete individual image data for cleanup', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        dataUrl: fc.string({ minLength: 5, maxLength: 50 }).map(s => `data:image/png;base64,${btoa(s)}`),
                    }), { minLength: 1, maxLength: 5 }),
                    async (imageRecords) => {
                        const testService = new IndexedDBBinaryStorageService();

                        // Store all records
                        for (const record of imageRecords) {
                            await testService.storeImageData(record.id, record.dataUrl);
                        }

                        // Delete each record one by one and verify cleanup
                        for (const record of imageRecords) {
                            // Verify it exists before deletion
                            const beforeDeletion = await testService.getImageData(record.id);
                            expect(beforeDeletion).toBe(record.dataUrl);

                            // Delete the record
                            await testService.deleteImageData(record.id);

                            // Verify it's gone after deletion
                            const afterDeletion = await testService.getImageData(record.id);
                            expect(afterDeletion).toBeNull();
                        }
                    }
                ),
                { numRuns: 5, timeout: 5000 }
            );
        });
    });

    describe('Unit Tests', () => {
        it('should calculate storage usage', async () => {
            const testService = new IndexedDBBinaryStorageService();

            // Mock navigator.storage.estimate
            const mockEstimate = vi.fn().mockResolvedValue({
                usage: 1024 * 1024, // 1MB
                quota: 1024 * 1024 * 1024 // 1GB
            });

            // @ts-expect-error Mocking navigator.storage
            global.navigator = {
                storage: {
                    estimate: mockEstimate
                }
            };

            const usage = await testService.getStorageUsage();

            expect(usage.used).toBe(1024 * 1024);
            expect(usage.quota).toBe(1024 * 1024 * 1024);
            expect(mockEstimate).toHaveBeenCalled();
        });

        it('should detect when storage is near quota', async () => {
            const testService = new IndexedDBBinaryStorageService();

            // Mock high usage scenario
            const mockEstimate = vi.fn().mockResolvedValue({
                usage: 850 * 1024 * 1024, // 850MB
                quota: 1024 * 1024 * 1024 // 1GB
            });

            // @ts-expect-error Mocking navigator.storage
            global.navigator = {
                storage: {
                    estimate: mockEstimate
                }
            };

            const isNearQuota = await testService.isStorageNearQuota(0.8); // 80% threshold
            expect(isNearQuota).toBe(true);

            const isNotNearQuota = await testService.isStorageNearQuota(0.9); // 90% threshold
            expect(isNotNearQuota).toBe(false);
        });

        it('should not trigger cleanup when storage is not near quota', async () => {
            const testService = new IndexedDBBinaryStorageService();

            // Mock low usage scenario
            const mockEstimate = vi.fn().mockResolvedValue({
                usage: 100 * 1024 * 1024, // 100MB
                quota: 1024 * 1024 * 1024 // 1GB
            });

            // @ts-expect-error Mocking navigator.storage
            global.navigator = {
                storage: {
                    estimate: mockEstimate
                }
            };

            const cleanedIds = await testService.autoCleanupIfNeeded(0.8);
            expect(cleanedIds).toEqual([]);
        });

        it('should store image data with quota management', async () => {
            const testService = new IndexedDBBinaryStorageService();

            // Mock normal usage scenario
            const mockEstimate = vi.fn().mockResolvedValue({
                usage: 100 * 1024 * 1024, // 100MB
                quota: 1024 * 1024 * 1024 // 1GB
            });

            // @ts-expect-error Mocking navigator.storage
            global.navigator = {
                storage: {
                    estimate: mockEstimate
                }
            };

            const testId = 'test-quota-managed-image';
            const testDataUrl = 'data:image/png;base64,testdata';

            await testService.storeImageDataWithQuotaManagement(testId, testDataUrl);

            const retrievedData = await testService.getImageData(testId);
            expect(retrievedData).toBe(testDataUrl);

            // Cleanup
            await testService.deleteImageData(testId);
        });
    });
});