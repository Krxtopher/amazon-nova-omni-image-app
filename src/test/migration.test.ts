import { describe, it, expect, beforeEach } from 'vitest';
import { sqliteService } from '../services/sqliteService';

describe('Database Migration', () => {
    beforeEach(async () => {
        // Clear database before each test
        await sqliteService.clearAll();
    });

    it('should migrate existing images from old schema to new schema', async () => {
        // First, simulate the old schema by directly inserting into old table
        await sqliteService.init();

        // Access the internal database to create old schema
        const db = (sqliteService as any).db;

        // Create old images table
        db.run(`
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

        // Insert test data into old table
        const testImage = {
            id: 'migration-test-1',
            url: 'data:image/png;base64,test-data',
            prompt: 'Test migration image',
            status: 'complete',
            aspectRatio: '1:1',
            width: 100,
            height: 100,
            createdAt: Date.now(),
            error: null,
            converseParams: null,
        };

        db.run(
            `INSERT INTO images (id, url, prompt, status, aspectRatio, width, height, createdAt, error, converseParams)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                testImage.id,
                testImage.url,
                testImage.prompt,
                testImage.status,
                testImage.aspectRatio,
                testImage.width,
                testImage.height,
                testImage.createdAt,
                testImage.error,
                testImage.converseParams,
            ]
        );

        // Now run migration by calling createTables (which includes runMigrations)
        (sqliteService as any).createTables();

        // Verify data was migrated to new tables
        const metadata = await sqliteService.getAllImageMetadata();
        expect(metadata).toHaveLength(1);
        expect(metadata[0].id).toBe('migration-test-1');
        expect(metadata[0].prompt).toBe('Test migration image');

        const imageData = await sqliteService.getImageData('migration-test-1');
        expect(imageData).toBeTruthy();
        expect(imageData?.url).toBe('data:image/png;base64,test-data');

        // Verify old table was dropped
        const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='images'");
        expect(tablesResult.length === 0 || tablesResult[0].values.length === 0).toBe(true);
    });

    it('should handle migration when no old data exists', async () => {
        // Just initialize normally - should not throw errors
        await sqliteService.init();

        const metadata = await sqliteService.getAllImageMetadata();
        expect(metadata).toHaveLength(0);
    });
});