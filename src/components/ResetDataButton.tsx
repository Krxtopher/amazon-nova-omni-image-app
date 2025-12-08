import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { sqliteService } from '@/services/sqliteService';
import { useImageStore } from '@/stores/imageStore';
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

    /**
     * Handle the reset action
     */
    const handleReset = async () => {
        setIsResetting(true);
        try {
            // Clear all data from SQLite
            await sqliteService.clearAll();

            // Reinitialize the store with empty data
            await initialize();

            setShowConfirm(false);

            // Show success notification
            toast.success('All data has been reset', {
                duration: 3000,
            });
        } catch (error) {
            console.error('Failed to reset data:', error);
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

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div
                    className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => !isResetting && setShowConfirm(false)}
                >
                    <div
                        className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4"
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
                </div>
            )}
        </>
    );
}
