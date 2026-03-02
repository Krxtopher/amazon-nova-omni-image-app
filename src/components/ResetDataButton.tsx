import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { amplifyDataService } from '@/services/AmplifyDataService';
import { amplifyStorageService } from '@/services/AmplifyStorageService';
import { useImageStore } from '@/stores/imageStore';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { toast } from 'sonner';

/**
 * ResetDataButton Component
 * 
 * Provides a button to completely clear all stored data (images and settings)
 * with a confirmation dialog to prevent accidental deletion.
 */
export function ResetDataButton() {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const { initialize } = useImageStore();

    // Lock body scrolling when confirmation dialog is open
    useBodyScrollLock(showConfirm);

    /**
     * Handle the reset action
     */
    const handleReset = async () => {
        setIsResetting(true);
        try {
            // Delete all images (S3 files + DynamoDB metadata) for the current user
            const images = await amplifyDataService.listImageMetadata();
            await Promise.all(
                images.map(async (image) => {
                    try {
                        await amplifyStorageService.deleteImage(image.s3Key);
                    } catch {
                        // S3 file may already be gone
                    }
                    await amplifyDataService.deleteImageMetadata(image.id);
                })
            );

            // Delete all personas for the current user
            const personas = await amplifyDataService.listPersonaData();
            await Promise.all(
                personas.map((persona) => amplifyDataService.deletePersonaData(persona.id))
            );

            // Reinitialize the store with empty data
            await initialize();

            setShowConfirm(false);

            // Show success notification
            toast.success('All data has been reset', {
                duration: 3000,
            });
        } catch (error) {
            toast.error('Failed to reset data. Please try again.', {
                duration: 3000,
            });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="Reset all data"
            >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Data
            </Button>

            {/* Confirmation Dialog - rendered via portal to escape stacking context */}
            {showConfirm && createPortal(
                <div
                    className="fixed inset-0 z-100 bg-[#352E50]/60 flex items-center justify-center p-4"
                    onClick={() => !isResetting && setShowConfirm(false)}
                >
                    <div
                        className="bg-[#3C345A]/65 backdrop-blur-md border border-border rounded-2xl max-w-md w-full p-6 space-y-4 transition-all duration-200"
                        style={{
                            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-labelledby="reset-dialog-title"
                        aria-describedby="reset-dialog-description"
                    >
                        <div className="space-y-2">
                            <h2
                                id="reset-dialog-title"
                                className="text-lg font-semibold text-foreground"
                            >
                                Reset All Data?
                            </h2>
                            <p
                                id="reset-dialog-description"
                                className="text-sm text-muted-foreground"
                            >
                                This will permanently delete all your generated images and settings.
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirm(false)}
                                disabled={isResetting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleReset}
                                disabled={isResetting}
                            >
                                {isResetting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isResetting ? 'Resetting...' : 'Reset All Data'}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
