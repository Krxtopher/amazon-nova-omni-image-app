import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import type { GeneratedImage, ImageMetadata, ImageData } from '../types';

/**
 * SQLite database service for storing generated images
 * Provides better storage capacity than localStorage
 */
class SQLiteService {
    private db: Database | null = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private saveTimeout: NodeJS.Timeout | null = null;
    private pendingSave = false;

    /**
     * Initialize the SQLite database
     */
    async init(): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // 🕐 HYPOTHESIS 1 TEST: Time SQLite initialization
                const initStartTime = performance.now();
                console.log('🗄️ [H1-TEST] SQLite init starting');
                console.time('sqlite-init-total');
                console.time('sqljs-load');

                // Initialize SQL.js
                const SQL = await initSqlJs({
                    locateFile: (file: string) => {
                        // Use local wasm file from public directory
                        return `/${file}`;
                    },
                });

                console.timeEnd('sqljs-load');
                console.time('indexeddb-load');

                // Try to load existing database from IndexedDB
                const savedDb = await this.loadFromIndexedDB();

                console.timeEnd('indexeddb-load');
                console.time('db-setup');

                if (savedDb) {
                    console.log('🗄️ [H1-TEST] Loading existing database, size:', (savedDb.length / 1024 / 1024).toFixed(2), 'MB');
                    this.db = new SQL.Database(savedDb);
                    // Ensure new tables exist first
                    this.createTables();
                    // Save the database back to IndexedDB
                    await this.saveToIndexedDB();
                } else {
                    console.log('🗄️ [H1-TEST] Creating new database');
                    this.db = new SQL.Database();
                    this.createTables();
                }

                console.timeEnd('db-setup');
                console.timeEnd('sqlite-init-total');

                const initEndTime = performance.now();
                console.log('🗄️ [H1-TEST] SQLite init completed in:', (initEndTime - initStartTime).toFixed(2), 'ms');

                this.initialized = true;
            } catch (error) {
                console.error('Failed to initialize SQLite:', error);
                throw error;
            }
        })();

        return this.initPromise;
    }

    /**
     * Create database tables
     */
    private createTables(): void {
        if (!this.db) return;

        // Separate table for image metadata (loaded immediately)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS image_metadata (
                id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                status TEXT NOT NULL,
                aspectRatio TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                createdAt INTEGER NOT NULL,
                error TEXT,
                converseParams TEXT
            )
        `);

        // Separate table for image data (loaded on demand)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS image_data (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_image_metadata_createdAt ON image_metadata(createdAt DESC)
        `);


    }



    /**
     * Save database to IndexedDB
     */
    private async saveToIndexedDB(): Promise<void> {
        if (!this.db) return;

        // 🕐 HYPOTHESIS 1 TEST: Time IndexedDB operations in detail
        console.time('db-export');
        const exportStart = performance.now();

        const data = this.db.export();

        const exportEnd = performance.now();
        console.timeEnd('db-export');
        console.log('💾 [H1-TEST] Database export took:', (exportEnd - exportStart).toFixed(2), 'ms, size:', (data.length / 1024 / 1024).toFixed(2), 'MB');

        console.time('blob-creation');
        const blobStart = performance.now();

        const blob = new Blob([data as BlobPart], { type: 'application/x-sqlite3' });

        const blobEnd = performance.now();
        console.timeEnd('blob-creation');
        console.log('💾 [H1-TEST] Blob creation took:', (blobEnd - blobStart).toFixed(2), 'ms');

        return new Promise((resolve, reject) => {
            console.time('indexeddb-transaction');
            const transactionStart = performance.now();

            const request = indexedDB.open('ImageGeneratorDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['database'], 'readwrite');
                const store = transaction.objectStore('database');

                console.time('indexeddb-put');
                const putStart = performance.now();

                store.put(blob, 'sqlite-db');

                transaction.oncomplete = () => {
                    const putEnd = performance.now();
                    console.timeEnd('indexeddb-put');
                    console.timeEnd('indexeddb-transaction');
                    console.log('💾 [H1-TEST] IndexedDB put operation took:', (putEnd - putStart).toFixed(2), 'ms');
                    console.log('💾 [H1-TEST] Total IndexedDB transaction took:', (putEnd - transactionStart).toFixed(2), 'ms');
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('database')) {
                    db.createObjectStore('database');
                }
            };
        });
    }

    /**
     * Load database from IndexedDB
     */
    private async loadFromIndexedDB(): Promise<Uint8Array | null> {
        return new Promise((resolve, reject) => {
            // 🕐 HYPOTHESIS 1 TEST: Time IndexedDB load operations
            console.time('indexeddb-open');

            const request = indexedDB.open('ImageGeneratorDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.timeEnd('indexeddb-open');
                const db = request.result;

                if (!db.objectStoreNames.contains('database')) {
                    console.log('💾 [H1-TEST] No existing database found in IndexedDB');
                    resolve(null);
                    return;
                }

                console.time('indexeddb-read');
                const readStart = performance.now();

                const transaction = db.transaction(['database'], 'readonly');
                const store = transaction.objectStore('database');
                const getRequest = store.get('sqlite-db');

                getRequest.onsuccess = async () => {
                    if (getRequest.result) {
                        console.time('blob-to-array');
                        const blobStart = performance.now();

                        const blob = getRequest.result as Blob;
                        console.log('💾 [H1-TEST] Found existing database blob, size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
                        const arrayBuffer = await blob.arrayBuffer();

                        const blobEnd = performance.now();
                        console.timeEnd('blob-to-array');
                        console.timeEnd('indexeddb-read');
                        console.log('💾 [H1-TEST] Blob to ArrayBuffer conversion took:', (blobEnd - blobStart).toFixed(2), 'ms');
                        console.log('💾 [H1-TEST] Total IndexedDB read took:', (blobEnd - readStart).toFixed(2), 'ms');

                        resolve(new Uint8Array(arrayBuffer));
                    } else {
                        console.timeEnd('indexeddb-read');
                        console.log('💾 [H1-TEST] No database data found in IndexedDB');
                        resolve(null);
                    }
                };

                getRequest.onerror = () => reject(getRequest.error);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('database')) {
                    db.createObjectStore('database');
                }
            };
        });
    }

    /**
     * Add a new image (metadata and data separately)
     */
    async addImage(image: GeneratedImage): Promise<void> {
        // 🕐 HYPOTHESIS 1 TEST: Time SQLite operations
        const sqliteAddImageStart = performance.now();
        console.log('🗄️ [H1-TEST] SQLiteService.addImage called for:', image.id);
        console.time('sqlite-init');

        await this.init();
        console.timeEnd('sqlite-init');

        if (!this.db) throw new Error('Database not initialized');

        console.time('sqlite-insert-operations');
        const insertStart = performance.now();

        // Insert metadata
        this.db.run(
            `INSERT INTO image_metadata (id, prompt, status, aspectRatio, width, height, createdAt, error, converseParams)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                image.id,
                image.prompt,
                image.status,
                image.aspectRatio,
                image.width,
                image.height,
                image.createdAt.getTime(),
                image.error || null,
                image.converseParams ? JSON.stringify(image.converseParams) : null,
            ]
        );

        // Insert image data if URL is provided
        if (image.url) {
            this.db.run(
                `INSERT INTO image_data (id, url) VALUES (?, ?)`,
                [image.id, image.url]
            );
        }

        const insertEnd = performance.now();
        console.timeEnd('sqlite-insert-operations');
        console.log('🗄️ [H1-TEST] SQLite insert operations took:', (insertEnd - insertStart).toFixed(2), 'ms');

        // 🚀 PERFORMANCE FIX: Use debounced save instead of immediate save
        // This prevents blocking the UI thread with massive database exports
        const saveStart = performance.now();
        console.log('💾 [PERFORMANCE-FIX] Using debounced save to prevent UI blocking');
        this.debouncedSaveToIndexedDB();

        const saveEnd = performance.now();
        console.log('💾 [PERFORMANCE-FIX] Debounced save scheduled in:', (saveEnd - saveStart).toFixed(2), 'ms');

        const totalSqliteTime = saveEnd - sqliteAddImageStart;
        console.log('🗄️ [H1-TEST] Total SQLiteService.addImage time:', totalSqliteTime.toFixed(2), 'ms');

        // Log database size for correlation analysis
        if (this.db) {
            const dbSize = this.db.export().length;
            console.log('📊 [H1-TEST] Current database size:', (dbSize / 1024 / 1024).toFixed(2), 'MB');
        }
    }

    /**
     * Debounced save to IndexedDB - prevents excessive saves during rapid operations
     */
    private debouncedSaveToIndexedDB(): void {
        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Set new timeout - save after 1 second of inactivity
        this.saveTimeout = setTimeout(async () => {
            if (!this.pendingSave) {
                this.pendingSave = true;
                try {
                    console.log('💾 [DEBOUNCED] Performing batched IndexedDB save');
                    console.time('debounced-indexeddb-save');
                    await this.saveToIndexedDB();
                    console.timeEnd('debounced-indexeddb-save');
                } catch (error) {
                    console.error('💾 [DEBOUNCED] Failed to save to IndexedDB:', error);
                } finally {
                    this.pendingSave = false;
                }
            }
        }, 1000);
    }

    /**
     * Update an existing image (metadata and/or data)
     */
    async updateImage(id: string, updates: Partial<GeneratedImage>): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        // Update metadata if any metadata fields are provided
        const metadataFields = ['prompt', 'status', 'aspectRatio', 'width', 'height', 'error', 'converseParams'];
        const metadataUpdates = Object.keys(updates).filter(key => metadataFields.includes(key));

        if (metadataUpdates.length > 0) {
            const setClauses: string[] = [];
            const values: any[] = [];

            if (updates.prompt !== undefined) {
                setClauses.push('prompt = ?');
                values.push(updates.prompt);
            }
            if (updates.status !== undefined) {
                setClauses.push('status = ?');
                values.push(updates.status);
            }
            if (updates.aspectRatio !== undefined) {
                setClauses.push('aspectRatio = ?');
                values.push(updates.aspectRatio);
            }
            if (updates.width !== undefined) {
                setClauses.push('width = ?');
                values.push(updates.width);
            }
            if (updates.height !== undefined) {
                setClauses.push('height = ?');
                values.push(updates.height);
            }
            if (updates.error !== undefined) {
                setClauses.push('error = ?');
                values.push(updates.error);
            }
            if (updates.converseParams !== undefined) {
                setClauses.push('converseParams = ?');
                values.push(updates.converseParams ? JSON.stringify(updates.converseParams) : null);
            }

            values.push(id);

            this.db.run(
                `UPDATE image_metadata SET ${setClauses.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Update image data if URL is provided
        if (updates.url !== undefined) {
            this.db.run(
                `INSERT OR REPLACE INTO image_data (id, url) VALUES (?, ?)`,
                [id, updates.url]
            );
        }

        this.debouncedSaveToIndexedDB();
    }

    /**
     * Delete an image (both metadata and data)
     */
    async deleteImage(id: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM image_metadata WHERE id = ?', [id]);
        this.db.run('DELETE FROM image_data WHERE id = ?', [id]);
        this.debouncedSaveToIndexedDB();
    }

    /**
     * Delete multiple images by their IDs
     */
    async deleteImages(ids: string[]): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        if (ids.length === 0) return;

        const placeholders = ids.map(() => '?').join(',');
        this.db.run(`DELETE FROM image_metadata WHERE id IN (${placeholders})`, ids);
        this.db.run(`DELETE FROM image_data WHERE id IN (${placeholders})`, ids);
        await this.saveToIndexedDB();
    }

    /**
     * Delete images by status
     */
    async deleteImagesByStatus(statuses: string[]): Promise<number> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        if (statuses.length === 0) return 0;

        // First count how many will be deleted
        const placeholders = statuses.map(() => '?').join(',');
        const countResult = this.db.exec(`SELECT COUNT(*) FROM image_metadata WHERE status IN (${placeholders})`, statuses);
        const deletedCount = countResult.length > 0 ? countResult[0].values[0][0] as number : 0;

        // Then delete them
        this.db.run(`DELETE FROM image_metadata WHERE status IN (${placeholders})`, statuses);
        this.db.run(`DELETE FROM image_data WHERE id IN (SELECT id FROM image_metadata WHERE status IN (${placeholders}))`, statuses);

        await this.saveToIndexedDB();

        return deletedCount;
    }

    /**
     * Get all image metadata (without image data for performance)
     */
    async getAllImageMetadata(): Promise<ImageMetadata[]> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const result = this.db.exec('SELECT * FROM image_metadata ORDER BY createdAt DESC');

        if (result.length === 0) return [];

        const images: ImageMetadata[] = [];
        const columns = result[0].columns;
        const values = result[0].values;

        for (const row of values) {
            const image: Record<string, any> = {};
            columns.forEach((col: string, idx: number) => {
                image[col] = row[idx];
            });

            images.push({
                id: image.id,
                prompt: image.prompt,
                status: image.status,
                aspectRatio: image.aspectRatio,
                width: image.width,
                height: image.height,
                createdAt: new Date(image.createdAt),
                error: image.error || undefined,
                converseParams: image.converseParams ? JSON.parse(image.converseParams) : undefined,
            });
        }

        return images;
    }

    /**
     * Get paginated image metadata (without image data for performance)
     */
    async getImageMetadataPaginated(offset: number = 0, limit: number = 20): Promise<ImageMetadata[]> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const result = this.db.exec(
            'SELECT * FROM image_metadata ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        if (result.length === 0) return [];

        const images: ImageMetadata[] = [];
        const columns = result[0].columns;
        const values = result[0].values;

        for (const row of values) {
            const image: Record<string, any> = {};
            columns.forEach((col: string, idx: number) => {
                image[col] = row[idx];
            });

            images.push({
                id: image.id,
                prompt: image.prompt,
                status: image.status,
                aspectRatio: image.aspectRatio,
                width: image.width,
                height: image.height,
                createdAt: new Date(image.createdAt),
                error: image.error || undefined,
                converseParams: image.converseParams ? JSON.parse(image.converseParams) : undefined,
            });
        }

        return images;
    }

    /**
     * Get total count of complete image metadata records (excludes incomplete images)
     */
    async getCompleteImageMetadataCount(): Promise<number> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const result = this.db.exec("SELECT COUNT(*) FROM image_metadata WHERE status = 'complete'");
        return result.length > 0 ? result[0].values[0][0] as number : 0;
    }

    /**
     * Get paginated complete image metadata (excludes incomplete images and deletes them)
     */
    async getCompleteImageMetadataPaginated(offset: number = 0, limit: number = 20): Promise<ImageMetadata[]> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        // First, delete any incomplete images we encounter (limit to avoid performance issues)
        const incompleteResult = this.db.exec(
            "SELECT id FROM image_metadata WHERE status IN ('pending', 'queued', 'generating', 'error') LIMIT 20"
        );

        if (incompleteResult.length > 0 && incompleteResult[0].values.length > 0) {
            const incompleteIds = incompleteResult[0].values.map(row => row[0] as string);
            console.log('🧹 Found', incompleteIds.length, 'incomplete images, deleting them...');

            const placeholders = incompleteIds.map(() => '?').join(',');
            this.db.run(`DELETE FROM image_metadata WHERE id IN (${placeholders})`, incompleteIds);
            this.db.run(`DELETE FROM image_data WHERE id IN (${placeholders})`, incompleteIds);

            // Save changes asynchronously to avoid blocking
            this.saveToIndexedDB().catch(error => {
                console.error('Failed to save after cleanup:', error);
            });
        }

        // Now get complete images
        const result = this.db.exec(
            "SELECT * FROM image_metadata WHERE status = 'complete' ORDER BY createdAt DESC LIMIT ? OFFSET ?",
            [limit, offset]
        );

        if (result.length === 0) return [];

        const images: ImageMetadata[] = [];
        const columns = result[0].columns;
        const values = result[0].values;

        for (const row of values) {
            const image: Record<string, any> = {};
            columns.forEach((col: string, idx: number) => {
                image[col] = row[idx];
            });

            images.push({
                id: image.id,
                prompt: image.prompt,
                status: image.status,
                aspectRatio: image.aspectRatio,
                width: image.width,
                height: image.height,
                createdAt: new Date(image.createdAt),
                error: image.error || undefined,
                converseParams: image.converseParams ? JSON.parse(image.converseParams) : undefined,
            });
        }

        return images;
    }

    /**
     * Get image data by ID (loaded on demand)
     */
    async getImageData(id: string): Promise<ImageData | null> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const result = this.db.exec('SELECT * FROM image_data WHERE id = ?', [id]);

        if (result.length === 0 || result[0].values.length === 0) return null;

        const row = result[0].values[0];
        return {
            id: row[0] as string,
            url: row[1] as string,
        };
    }

    /**
     * Get complete image (metadata + data) - for backward compatibility
     */
    async getAllImages(): Promise<GeneratedImage[]> {
        const metadata = await this.getAllImageMetadata();
        const images: GeneratedImage[] = [];

        for (const meta of metadata) {
            const imageData = await this.getImageData(meta.id);
            images.push({
                ...meta,
                url: imageData?.url,
            });
        }

        return images;
    }

    /**
     * Get a setting value
     */
    async getSetting(key: string): Promise<string | number | null> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const result = this.db.exec('SELECT value FROM settings WHERE key = ?', [key]);

        if (result.length === 0 || result[0].values.length === 0) return null;

        const value = result[0].values[0][0] as string;

        // Try to parse as number if it looks like one
        const numValue = Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
            return numValue;
        }

        return value;
    }

    /**
     * Set a setting value
     */
    async setSetting(key: string, value: string | number): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, String(value)]
        );

        await this.saveToIndexedDB();
    }

    /**
     * Delete a setting
     */
    async deleteSetting(key: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM settings WHERE key = ?', [key]);
        await this.saveToIndexedDB();
    }

    /**
     * Clear all data
     */
    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM image_metadata');
        this.db.run('DELETE FROM image_data');
        this.db.run('DELETE FROM settings');
        await this.saveToIndexedDB();
    }

    /**
     * Delete all images but preserve settings
     */
    async deleteAllImages(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM image_metadata');
        this.db.run('DELETE FROM image_data');
        await this.saveToIndexedDB();
    }

    /**
     * Debug method to inspect database contents
     */
    async debugDatabase(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        // Show all tables
        const tablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = tablesResult.length > 0 ? tablesResult[0].values.map(row => row[0]) : [];

        // Count records in each table
        for (const tableName of tableNames) {
            try {
                this.db.exec(`SELECT COUNT(*) FROM ${tableName}`);
            } catch (error) {
                // Silently handle counting errors
            }
        }
    }
}

export const sqliteService = new SQLiteService();
