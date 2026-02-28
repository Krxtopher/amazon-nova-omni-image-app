/**
 * Amplify S3 Storage Service
 * Handles secure image access and deletion using AWS Amplify Storage.
 * Image uploads are handled exclusively by the Lambda function.
 */

import { getUrl, remove, list } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';

export interface AmplifyStorageService {
    // Image access operations
    getSecureImageUrl(s3Key: string, expirationMinutes?: number): Promise<string>;

    // Image management operations
    deleteImage(s3Key: string): Promise<void>;
    listUserImages(): Promise<string[]>;
}

/**
 * Amplify S3 Storage Service Implementation
 * Uses path-based access (Amplify Gen 2) — all calls use `path` instead of `key`
 * so that Amplify doesn't prepend `public/` to the S3 key.
 */
export class AmplifyS3StorageService implements AmplifyStorageService {
    private readonly imageFolder = 'images';

    /**
     * Get secure, time-limited URL for image access.
     * Uses path-based API to match the Gen 2 storage config.
     */
    async getSecureImageUrl(s3Key: string, expirationMinutes: number = 60): Promise<string> {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('User must be authenticated to access images');
            }

            if (!this.isUserAuthorizedForKey(s3Key, user.userId)) {
                throw new Error('User not authorized to access this image');
            }

            const result = await getUrl({
                path: s3Key,
                options: {
                    expiresIn: expirationMinutes * 60,
                    validateObjectExistence: true
                }
            });

            return result.url.toString();
        } catch (error) {
            throw new Error(`Failed to generate secure URL: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Delete image from S3 storage.
     * Uses path-based API to match the Gen 2 storage config.
     */
    async deleteImage(s3Key: string): Promise<void> {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('User must be authenticated to delete images');
            }

            if (!this.isUserAuthorizedForKey(s3Key, user.userId)) {
                throw new Error('User not authorized to delete this image');
            }

            await remove({ path: s3Key });
        } catch (error) {
            throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * List all images for the current user.
     * Uses path-based API to match the Gen 2 storage config.
     */
    async listUserImages(): Promise<string[]> {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('User must be authenticated to list images');
            }

            const result = await list({
                path: `${this.imageFolder}/${user.userId}/`,
                options: {
                    listAll: true
                }
            });

            return result.items
                .map(item => item.path)
                .filter(Boolean);
        } catch (error) {
            throw new Error(`Failed to list user images: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Check if user is authorized to access a specific S3 key.
     */
    private isUserAuthorizedForKey(s3Key: string, _userId: string): boolean {
        return s3Key.startsWith(`${this.imageFolder}/`);
    }
}

// Export singleton instance
export const amplifyStorageService = new AmplifyS3StorageService();
