/**
 * IndexedDB Binary Storage Service
 * Handles image binary data storage optimized for large binary data
 */

import { storageLogger } from '../utils/StorageLogger';

export interface BinaryStorageService {
    // Binary data operations
    storeImageData(id: string, dataUrl: string): Promise<void>;
    getImageData(id: string): Promise<string | null>;
    deleteImageData(id: string): Promise<void>;
    deleteMultipleImageData(ids: string[]): Promise<void>;

    // Storage management
    getStorageUsage(): Promise<{ used: number; quota: number }>;
    cleanupOldestImages(count: number): Promise<string[]>;

    // Quota management
    isStorageNearQuota(threshold?: number): Promise<boolean>;
    autoCleanupIfNeeded(threshold?: number, cleanupCount?: number): Promise<string[]>;
    storeImageDataWithQuotaManagement(id: string, dataUrl: string): Promise<void>;
}

interface BinaryDataRecord {
    id: string;
    dataUrl: string;
    size: number;
    createdAt: number;
    lastAccessed: number;
}

/**
 * IndexedDB Binary Storage Service Implementation
 * Optimized for storing and retrieving large image binary data
 */
export class IndexedDBBinaryStorageService implements BinaryStorageService {
    private readonly dbName = 'ImageBinaryStorage';
    private readonly dbVersion = 1;
    private readonly storeName = 'binaryData';
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the IndexedDB database
     */
    private async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        console.log('🗃️ [INDEXEDDB] Starting IndexedDB initialization...');
        const startTime = performance.now();

        this.initPromise = new Promise((resolve, reject) => {
            console.log('🔌 [INDEXEDDB] Opening IndexedDB connection...');
            const connectionStart = performance.now();

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                const duration = performance.now() - startTime;
                console.error(`❌ [INDEXEDDB] Failed to open IndexedDB after ${duration.toFixed(0)}ms:`, request.error?.message);
                reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
            };

            request.onsuccess = () => {
                const connectionDuration = performance.now() - connectionStart;
                console.log(`✅ [INDEXEDDB] IndexedDB connection established in ${connectionDuration.toFixed(0)}ms`);

                this.db = request.result;
                const totalDuration = performance.now() - startTime;
                console.log(`🎉 [INDEXEDDB] IndexedDB initialization completed in ${totalDuration.toFixed(0)}ms`);
                resolve();
            };

            request.onupgradeneeded = (event) => {
                console.log('🔧 [INDEXEDDB] Database upgrade needed, creating object stores...');
                const upgradeStart = performance.now();

                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store for binary data
                if (!Array.from(db.objectStoreNames).includes(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });

                    // Create indexes for efficient queries
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                    store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                    store.createIndex('size', 'size', { unique: false });

                    const upgradeDuration = performance.now() - upgradeStart;
                    console.log(`✅ [INDEXEDDB] Object stores and indexes created in ${upgradeDuration.toFixed(0)}ms`);
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Store image binary data with retry mechanism
     */
    async storeImageData(id: string, dataUrl: string): Promise<void> {
        const timer = storageLogger.startOperation('storeImageData', 'indexeddb', { imageId: id });
        const size = this.calculateDataUrlSize(dataUrl);

        try {
            await this.init();
            if (!this.db) throw new Error('Database not initialized');

            const now = Date.now();

            const record: BinaryDataRecord = {
                id,
                dataUrl,
                size,
                createdAt: now,
                lastAccessed: now
            };

            await this.executeWithRetry(async () => {
                const transaction = this.db!.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                return new Promise<void>((resolve, reject) => {
                    const request = store.put(record);

                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(new Error(`Failed to store image data: ${request.error?.message}`));

                    transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error?.message}`));
                });
            });

            timer.success(size);
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)), size);
            throw error;
        }
    }

    /**
     * Retrieve image binary data with access tracking
     */
    async getImageData(id: string): Promise<string | null> {
        const timer = storageLogger.startOperation('getImageData', 'indexeddb', { imageId: id });
        console.log(`🔍 [INDEXEDDB] Retrieving image data for ${id}...`);
        const startTime = performance.now();

        try {
            // Step 1: Ensure IndexedDB is initialized
            console.log(`🔌 [INDEXEDDB] Ensuring IndexedDB connection for ${id}...`);
            const initStart = performance.now();

            await this.init();
            if (!this.db) throw new Error('Database not initialized');

            const initDuration = performance.now() - initStart;
            console.log(`✅ [INDEXEDDB] IndexedDB ready for ${id} in ${initDuration.toFixed(0)}ms`);

            // Step 2: Execute the retrieval with retry logic
            console.log(`📦 [INDEXEDDB] Executing retrieval query for ${id}...`);
            const queryStart = performance.now();

            const result = await this.executeWithRetry(async () => {
                const transaction = this.db!.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                return new Promise<string | null>((resolve, reject) => {
                    const request = store.get(id);

                    request.onsuccess = () => {
                        const record = request.result as BinaryDataRecord | undefined;

                        if (!record) {
                            resolve(null);
                            return;
                        }

                        console.log(`📊 [INDEXEDDB] Found record for ${id}: ${Math.round(record.size / 1024)}KB, created ${new Date(record.createdAt).toISOString().split('T')[0]}`);

                        // Update last accessed time for cleanup strategies
                        const accessUpdateStart = performance.now();
                        record.lastAccessed = Date.now();
                        const updateRequest = store.put(record);

                        updateRequest.onsuccess = () => {
                            const accessUpdateDuration = performance.now() - accessUpdateStart;
                            // Only log slow access updates
                            if (accessUpdateDuration > 10) {
                                console.log(`✅ [INDEXEDDB] Access time updated for ${id} in ${accessUpdateDuration.toFixed(0)}ms`);
                            }
                            resolve(record.dataUrl);
                        };
                        updateRequest.onerror = () => {
                            // Still return the data even if access tracking fails
                            console.warn(`⚠️ [INDEXEDDB] Failed to update access time for ${id}, but returning data anyway`);
                            resolve(record.dataUrl);
                        };
                    };

                    request.onerror = () => reject(new Error(`Failed to retrieve image data: ${request.error?.message}`));
                    transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error?.message}`));
                });
            });

            const queryDuration = performance.now() - queryStart;
            const totalDuration = performance.now() - startTime;

            if (result) {
                console.log(`✅ [INDEXEDDB] Successfully retrieved ${Math.round(result.length / 1024)}KB for ${id} in ${totalDuration.toFixed(0)}ms`);
                // Only show breakdown for slow operations
                if (totalDuration > 100) {
                    console.log(`📊 [INDEXEDDB] Breakdown: Init(${initDuration.toFixed(0)}ms) + Query(${queryDuration.toFixed(0)}ms)`);
                }

                timer.success(result?.length, {
                    found: result !== null,
                    totalDuration,
                    breakdown: {
                        init: initDuration,
                        query: queryDuration
                    }
                });
            } else {
                console.log(`⚠️ [INDEXEDDB] No data found for ${id} in ${totalDuration.toFixed(0)}ms`);
                timer.success(0, { found: false, totalDuration });
            }

            return result;
        } catch (error) {
            const totalDuration = performance.now() - startTime;
            console.error(`❌ [INDEXEDDB] Failed to retrieve ${id} after ${totalDuration.toFixed(0)}ms:`, error);
            timer.error(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Delete image binary data
     */
    async deleteImageData(id: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return this.executeWithRetry(async () => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            return new Promise<void>((resolve, reject) => {
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error(`Failed to delete image data: ${request.error?.message}`));

                transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error?.message}`));
            });
        });
    }

    /**
     * Delete multiple image binary data records
     */
    async deleteMultipleImageData(ids: string[]): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        if (ids.length === 0) return;

        return this.executeWithRetry(async () => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            return new Promise<void>((resolve, reject) => {
                let completed = 0;
                let hasError = false;

                const checkCompletion = () => {
                    if (hasError) return;

                    completed++;
                    if (completed === ids.length) {
                        resolve();
                    }
                };

                for (const id of ids) {
                    const request = store.delete(id);

                    request.onsuccess = checkCompletion;
                    request.onerror = () => {
                        if (!hasError) {
                            hasError = true;
                            reject(new Error(`Failed to delete image data for ID ${id}: ${request.error?.message}`));
                        }
                    };
                }

                transaction.onerror = () => {
                    if (!hasError) {
                        hasError = true;
                        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
                    }
                };
            });
        });
    }

    /**
     * Get storage usage information
     */
    async getStorageUsage(): Promise<{ used: number; quota: number }> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }

        // Fallback: calculate used space by iterating through records
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);

        return new Promise((resolve, reject) => {
            let totalSize = 0;

            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;

                if (cursor) {
                    const record = cursor.value as BinaryDataRecord;
                    totalSize += record.size;
                    cursor.continue();
                } else {
                    // Estimate quota as 1GB if not available
                    resolve({
                        used: totalSize,
                        quota: 1024 * 1024 * 1024
                    });
                }
            };

            request.onerror = () => reject(new Error(`Failed to calculate storage usage: ${request.error?.message}`));
            transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error?.message}`));
        });
    }

    /**
     * Check if storage is approaching quota limits
     */
    async isStorageNearQuota(threshold: number = 0.8): Promise<boolean> {
        const { used, quota } = await this.getStorageUsage();
        return quota > 0 && (used / quota) >= threshold;
    }

    /**
     * Automatically cleanup storage if approaching quota limits
     */
    async autoCleanupIfNeeded(threshold: number = 0.8, cleanupCount: number = 10): Promise<string[]> {
        const isNearQuota = await this.isStorageNearQuota(threshold);

        if (isNearQuota) {
            return await this.cleanupOldestImages(cleanupCount);
        }

        return [];
    }

    /**
     * Store image binary data with automatic quota management
     */
    async storeImageDataWithQuotaManagement(id: string, dataUrl: string): Promise<void> {
        // Check quota before storing
        await this.autoCleanupIfNeeded();

        // Store the data
        await this.storeImageData(id, dataUrl);
    }

    /**
     * Cleanup oldest images based on creation time
     */
    async cleanupOldestImages(count: number): Promise<string[]> {
        const timer = storageLogger.startOperation('cleanupOldestImages', 'indexeddb', { cleanupCount: count });

        try {
            await this.init();
            if (!this.db) throw new Error('Database not initialized');

            if (count <= 0) {
                timer.success(0, { deletedIds: [] });
                return [];
            }

            const deletedIds = await this.executeWithRetry(async () => {
                const transaction = this.db!.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('createdAt');

                return new Promise<string[]>((resolve, reject) => {
                    const deletedIds: string[] = [];
                    let processed = 0;

                    // Get oldest records first
                    const request = index.openCursor();

                    request.onsuccess = (event) => {
                        const cursor = (event.target as IDBRequest).result;

                        if (cursor && processed < count) {
                            const record = cursor.value as BinaryDataRecord;
                            deletedIds.push(record.id);

                            const deleteRequest = store.delete(record.id);
                            deleteRequest.onsuccess = () => {
                                processed++;
                                if (processed === count || processed === deletedIds.length) {
                                    resolve(deletedIds);
                                } else {
                                    cursor.continue();
                                }
                            };
                            deleteRequest.onerror = () => {
                                reject(new Error(`Failed to delete image ${record.id}: ${deleteRequest.error?.message}`));
                            };
                        } else {
                            resolve(deletedIds);
                        }
                    };

                    request.onerror = () => reject(new Error(`Failed to open cursor: ${request.error?.message}`));
                    transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error?.message}`));
                });
            });

            timer.success(undefined, { deletedCount: deletedIds.length, deletedIds });
            return deletedIds;
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Execute operation with retry mechanism
     */
    private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt === maxRetries) {
                    throw lastError;
                }

                // Exponential backoff: wait 100ms, 200ms, 400ms
                const delay = 100 * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Reinitialize database connection if needed
                if (this.db && (this.db as any).readyState === 'closed') {
                    this.db = null;
                    this.initPromise = null;
                    await this.init();
                }
            }
        }

        throw lastError!;
    }

    /**
     * Calculate the size of a data URL in bytes
     */
    private calculateDataUrlSize(dataUrl: string): number {
        // Data URL format: data:[<mediatype>][;base64],<data>
        const base64Index = dataUrl.indexOf(',');
        if (base64Index === -1) return dataUrl.length;

        const base64Data = dataUrl.substring(base64Index + 1);

        // Base64 encoding increases size by ~33%, so decode to get actual size
        // Each base64 character represents 6 bits, so 4 chars = 3 bytes
        const padding = (base64Data.match(/=/g) || []).length;
        return Math.floor((base64Data.length * 3) / 4) - padding;
    }
}

// Export singleton instance
export const binaryStorageService = new IndexedDBBinaryStorageService();