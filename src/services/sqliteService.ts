import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import type { GeneratedImage, ImageMetadata } from '../types';
import { storageLogger } from '../utils/StorageLogger';

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

        const timer = storageLogger.startOperation('init', 'sqlite');

        this.initPromise = (async () => {
            try {
                // Initialize SQL.js
                const SQL = await initSqlJs({
                    locateFile: (file: string) => {
                        // Use local wasm file from public directory
                        return `/${file}`;
                    },
                });

                // Try to load existing database from IndexedDB
                const savedDb = await this.loadFromIndexedDB();

                if (savedDb) {
                    this.db = new SQL.Database(savedDb);
                    // Ensure new tables exist first
                    this.createTables();
                    // Save the database back to IndexedDB
                    await this.saveToIndexedDB();
                } else {
                    this.db = new SQL.Database();
                    this.createTables();
                }

                this.initialized = true;
                timer.success(savedDb?.length);
            } catch (error) {
                timer.error(error instanceof Error ? error : new Error(String(error)));
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

        // Metadata-only table for image information (binary data stored separately in IndexedDB)
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
                converseParams TEXT,
                hasBinaryData BOOLEAN DEFAULT FALSE,
                binaryDataSize INTEGER DEFAULT 0
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

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_image_metadata_status ON image_metadata(status)
        `);

        // Migration: Add new columns to existing tables if they don't exist
        this.migrateSchema();
    }

    /**
     * Migrate existing database schema to metadata-only format
     */
    private migrateSchema(): void {
        if (!this.db) return;

        try {
            // Check if hasBinaryData column exists
            const tableInfo = this.db.exec("PRAGMA table_info(image_metadata)");
            const columns = tableInfo.length > 0 ? tableInfo[0].values.map(row => row[1] as string) : [];

            if (!columns.includes('hasBinaryData')) {
                this.db.run('ALTER TABLE image_metadata ADD COLUMN hasBinaryData BOOLEAN DEFAULT FALSE');
            }

            if (!columns.includes('binaryDataSize')) {
                this.db.run('ALTER TABLE image_metadata ADD COLUMN binaryDataSize INTEGER DEFAULT 0');
            }

            // If image_data table exists, migrate data and drop it
            const tables = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='image_data'");
            if (tables.length > 0) {
                // Update hasBinaryData flag for records that have image data
                this.db.run(`
                    UPDATE image_metadata 
                    SET hasBinaryData = TRUE, binaryDataSize = LENGTH(url) 
                    FROM image_data 
                    WHERE image_metadata.id = image_data.id
                `);

                // Drop the image_data table to save space
                this.db.run('DROP TABLE IF EXISTS image_data');
            }
        } catch (error) {
            // Silently handle migration errors
        }
    }



    /**
     * Save database to IndexedDB
     */
    private async saveToIndexedDB(): Promise<void> {
        if (!this.db) return;

        const timer = storageLogger.startOperation('saveToIndexedDB', 'sqlite');

        try {
            const data = this.db.export();
            const blob = new Blob([data as BlobPart], { type: 'application/x-sqlite3' });

            await new Promise<void>((resolve, reject) => {
                const request = indexedDB.open('ImageGeneratorDB', 1);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['database'], 'readwrite');
                    const store = transaction.objectStore('database');

                    store.put(blob, 'sqlite-db');

                    transaction.oncomplete = () => {
                        resolve();
                    };
                    transaction.onerror = () => reject(transaction.error);
                };

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!Array.from(db.objectStoreNames).includes('database')) {
                        db.createObjectStore('database');
                    }
                };
            });

            timer.success(blob.size);
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Load database from IndexedDB
     */
    private async loadFromIndexedDB(): Promise<Uint8Array | null> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ImageGeneratorDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;

                if (!Array.from(db.objectStoreNames).includes('database')) {
                    resolve(null);
                    return;
                }

                const transaction = db.transaction(['database'], 'readonly');
                const store = transaction.objectStore('database');
                const getRequest = store.get('sqlite-db');

                getRequest.onsuccess = async () => {
                    if (getRequest.result) {
                        const blob = getRequest.result as Blob;
                        const arrayBuffer = await blob.arrayBuffer();
                        resolve(new Uint8Array(arrayBuffer));
                    } else {
                        resolve(null);
                    }
                };

                getRequest.onerror = () => reject(getRequest.error);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!Array.from(db.objectStoreNames).includes('database')) {
                    db.createObjectStore('database');
                }
            };
        });
    }

    /**
     * Add image metadata only (binary data handled separately by BinaryStorageService)
     */
    async addImage(image: GeneratedImage): Promise<void> {
        const timer = storageLogger.startOperation('addImage', 'sqlite', { imageId: image.id });

        try {
            await this.init();

            if (!this.db) throw new Error('Database not initialized');

            // Insert metadata only - binary data is handled by BinaryStorageService
            this.db.run(
                `INSERT INTO image_metadata (id, prompt, status, aspectRatio, width, height, createdAt, error, converseParams, hasBinaryData, binaryDataSize)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                    image.url ? 1 : 0, // hasBinaryData (convert boolean to number)
                    image.url ? image.url.length : 0, // binaryDataSize (approximate)
                ]
            );

            // Use debounced save instead of immediate save
            // This prevents blocking the UI thread with database exports
            this.debouncedSaveToIndexedDB();

            timer.success();
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));
            throw error;
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
                const timer = storageLogger.startOperation('debouncedSave', 'sqlite');
                try {
                    await this.saveToIndexedDB();
                    timer.success();
                } catch (error) {
                    timer.error(error instanceof Error ? error : new Error(String(error)));
                    // Silently handle save errors
                } finally {
                    this.pendingSave = false;
                }
            }
        }, 1000);
    }

    /**
     * Update image metadata only (binary data handled separately by BinaryStorageService)
     */
    async updateImage(id: string, updates: Partial<GeneratedImage>): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        // Update metadata fields only
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
        if (updates.hasBinaryData !== undefined) {
            setClauses.push('hasBinaryData = ?');
            values.push(updates.hasBinaryData ? 1 : 0); // Convert boolean to number
        }
        if (updates.binaryDataSize !== undefined) {
            setClauses.push('binaryDataSize = ?');
            values.push(updates.binaryDataSize);
        }

        if (setClauses.length > 0) {
            values.push(id);
            this.db.run(
                `UPDATE image_metadata SET ${setClauses.join(', ')} WHERE id = ?`,
                values
            );
        }

        this.debouncedSaveToIndexedDB();
    }

    /**
     * Delete image metadata only (binary data handled separately by BinaryStorageService)
     */
    async deleteImage(id: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM image_metadata WHERE id = ?', [id]);
        this.debouncedSaveToIndexedDB();
    }

    /**
     * Delete multiple images by their IDs (metadata only)
     */
    async deleteImages(ids: string[]): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        if (ids.length === 0) return;

        const placeholders = ids.map(() => '?').join(',');
        this.db.run(`DELETE FROM image_metadata WHERE id IN (${placeholders})`, ids);
        await this.saveToIndexedDB();
    }

    /**
     * Delete images by status (metadata only)
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

        await this.saveToIndexedDB();

        return deletedCount;
    }

    /**
     * Get all image metadata (without image data for performance)
     */
    async getAllImageMetadata(): Promise<ImageMetadata[]> {
        const timer = storageLogger.startOperation('getAllImageMetadata', 'sqlite');

        try {
            await this.init();
            if (!this.db) throw new Error('Database not initialized');

            const result = this.db.exec('SELECT * FROM image_metadata ORDER BY createdAt DESC');

            if (result.length === 0) {
                timer.success(0);
                return [];
            }

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
                    hasBinaryData: Boolean(image.hasBinaryData),
                    binaryDataSize: image.binaryDataSize || 0,
                });
            }

            timer.success(undefined, { recordCount: images.length });
            return images;
        } catch (error) {
            timer.error(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
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
                hasBinaryData: Boolean(image.hasBinaryData),
                binaryDataSize: image.binaryDataSize || 0,
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

            const placeholders = incompleteIds.map(() => '?').join(',');
            this.db.run(`DELETE FROM image_metadata WHERE id IN (${placeholders})`, incompleteIds);

            // Save changes asynchronously to avoid blocking
            this.saveToIndexedDB().catch(() => {
                // Silently handle save errors
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
                hasBinaryData: Boolean(image.hasBinaryData),
                binaryDataSize: image.binaryDataSize || 0,
            });
        }

        return images;
    }

    /**
     * Get complete image (metadata only) - binary data handled separately by BinaryStorageService
     * This method is for backward compatibility but should be avoided for performance
     */
    async getAllImages(): Promise<GeneratedImage[]> {
        const metadata = await this.getAllImageMetadata();
        // Note: url field will be undefined - binary data should be loaded separately via BinaryStorageService
        return metadata.map(meta => ({ ...meta, url: undefined }));
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
     * Clear all data (metadata only)
     */
    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM image_metadata');
        this.db.run('DELETE FROM settings');
        await this.saveToIndexedDB();
    }

    /**
     * Delete all images but preserve settings (metadata only)
     */
    async deleteAllImages(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM image_metadata');
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
