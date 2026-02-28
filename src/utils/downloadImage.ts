/**
 * Download an image from a URL by fetching it as a blob first.
 * This avoids cross-origin issues with S3 presigned URLs where
 * the browser navigates instead of downloading.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    } catch {
        // Fallback: open in new tab if fetch fails
        window.open(url, '_blank');
    }
}
