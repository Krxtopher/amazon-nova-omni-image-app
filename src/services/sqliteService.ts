import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import type { GeneratedImage } from '../types';

/**
 * SQLite database service for storing generated images
 * Provides better storage capacity than localStorage
 */
class SQLiteService {
    private db: Database | null = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the SQLite database
     */
    async init(): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // Initialize SQL.js
                // In test environment, use local file; in browser, use CDN
                const isTest = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test';
                const SQL = await initSqlJs({
                    locateFile: (file: string) => {
                        if (isTest) {
                            // For Node.js/test environment, use the local file
                            return `node_modules/sql.js/dist/${file}`;
                        }
                        // For browser, use CDN
                        return `https://sql.js.org/dist/${file}`;
                    },
                });

                // Try to load existing database from IndexedDB (skip in test environment)
                const savedDb = !isTest ? await this.loadFromIndexedDB() : null;

                if (savedDb) {
                    this.db = new SQL.Database(savedDb);
                    // Run migrations for existing databases
                    this.runMigrations();
                    // Save the migrated database back to IndexedDB
                    await this.saveToIndexedDB();
                } else {
                    this.db = new SQL.Database();
                    this.createTables();
                }

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

        this.db.run(`
            CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
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

        this.db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_images_createdAt ON images(createdAt DESC)
        `);

        // Run migrations for existing databases
        this.runMigrations();
    }

    /**
     * Run database migrations
     */
    private runMigrations(): void {
        if (!this.db) return;

        try {
            // Ensure the images table exists first
            this.db.run(`
                CREATE TABLE IF NOT EXISTS images (
                    id TEXT PRIMARY KEY,
                    url TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    status TEXT NOT NULL,
                    aspectRatio TEXT NOT NULL,
                    width INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    createdAt INTEGER NOT NULL,
                    error TEXT
                )
            `);

            // Check if converseParams column exists, if not add it
            const result = this.db.exec("PRAGMA table_info(images)");
            if (result.length > 0) {
                const columns = result[0].values.map(row => row[1] as string);
                if (!columns.includes('converseParams')) {
                    console.log('Adding converseParams column to existing database');
                    this.db.run('ALTER TABLE images ADD COLUMN converseParams TEXT');
                    console.log('Successfully added converseParams column');
                }
            }

            // Ensure settings table exists
            this.db.run(`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `);

            // Ensure index exists
            this.db.run(`
                CREATE INDEX IF NOT EXISTS idx_images_createdAt ON images(createdAt DESC)
            `);
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    }

    /**
     * Save database to IndexedDB
     */
    private async saveToIndexedDB(): Promise<void> {
        if (!this.db) return;

        // Skip in test environment
        const isTest = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test';
        if (isTest) return;

        const data = this.db.export();
        const blob = new Blob([data as BlobPart], { type: 'application/x-sqlite3' });

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ImageGeneratorDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['database'], 'readwrite');
                const store = transaction.objectStore('database');
                store.put(blob, 'sqlite-db');

                transaction.oncomplete = () => resolve();
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
            const request = indexedDB.open('ImageGeneratorDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains('database')) {
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
                if (!db.objectStoreNames.contains('database')) {
                    db.createObjectStore('database');
                }
            };
        });
    }

    /**
     * Add a new image
     */
    async addImage(image: GeneratedImage): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run(
            `INSERT INTO images (id, url, prompt, status, aspectRatio, width, height, createdAt, error, converseParams)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                image.id,
                image.url,
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

        await this.saveToIndexedDB();
    }

    /**
     * Update an existing image
     */
    async updateImage(id: string, updates: Partial<GeneratedImage>): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.url !== undefined) {
            setClauses.push('url = ?');
            values.push(updates.url);
        }
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

        if (setClauses.length === 0) return;

        values.push(id);

        this.db.run(
            `UPDATE images SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        await this.saveToIndexedDB();
    }

    /**
     * Delete an image
     */
    async deleteImage(id: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM images WHERE id = ?', [id]);
        await this.saveToIndexedDB();
    }

    /**
     * Get all images
     */
    async getAllImages(): Promise<GeneratedImage[]> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const result = this.db.exec('SELECT * FROM images ORDER BY createdAt DESC');

        if (result.length === 0) return [];

        const images: GeneratedImage[] = [];
        const columns = result[0].columns;
        const values = result[0].values;

        for (const row of values) {
            const image: Record<string, any> = {};
            columns.forEach((col: string, idx: number) => {
                image[col] = row[idx];
            });

            images.push({
                id: image.id,
                url: image.url,
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
     * Get a setting value
     */
    async getSetting(key: string): Promise<string | null> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        const result = this.db.exec('SELECT value FROM settings WHERE key = ?', [key]);

        if (result.length === 0 || result[0].values.length === 0) return null;

        return result[0].values[0][0] as string;
    }

    /**
     * Set a setting value
     */
    async setSetting(key: string, value: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, value]
        );

        await this.saveToIndexedDB();
    }

    /**
     * Clear all data
     */
    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        this.db.run('DELETE FROM images');
        this.db.run('DELETE FROM settings');
        await this.saveToIndexedDB();
    }
}

export const sqliteService = new SQLiteService();
