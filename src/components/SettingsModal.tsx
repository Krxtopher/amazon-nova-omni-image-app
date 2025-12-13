import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Trash2, Loader2 } from 'lucide-react';
import { sqliteService } from '@/services/sqliteService';
import { useImageStore } from '@/stores/imageStore';
import { toast } from 'sonner';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Settings Modal Component
 * 
 * Contains application settings including data management options
 */
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
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

            setShowResetConfirm(false);
            onClose(); // Close the settings modal

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

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 bg-[#352E50]/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#3C345A]/65 backdrop-blur-md border border-border rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto transition-all duration-200"
                style={{
                    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)'
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="settings-modal-title"
                aria-describedby="settings-modal-description"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2
                        id="settings-modal-title"
                        className="text-lg font-semibold text-foreground"
                    >
                        Settings
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Data Management Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground">
                            Data Management
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm text-foreground">Reset All Data</p>
                                    <p className="text-xs text-muted-foreground">
                                        Permanently delete all generated images and settings
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowResetConfirm(true)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    aria-label="Reset all data"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Future settings sections can be added here */}
                </div>

                {/* Reset Confirmation Dialog */}
                {showResetConfirm && (
                    <div
                        className="absolute inset-0 bg-[#352E50]/60 flex items-center justify-center p-4 rounded-2xl"
                        onClick={() => !isResetting && setShowResetConfirm(false)}
                    >
                        <div
                            className="bg-[#3C345A]/65 backdrop-blur-md border border-border rounded-2xl max-w-sm w-full p-6 space-y-4 transition-all duration-200"
                            style={{
                                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-labelledby="reset-dialog-title"
                            aria-describedby="reset-dialog-description"
                        >
                            <div className="space-y-2">
                                <h3
                                    id="reset-dialog-title"
                                    className="text-lg font-semibold text-foreground"
                                >
                                    Reset All Data?
                                </h3>
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
                                    onClick={() => setShowResetConfirm(false)}
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
            </div>
        </div>,
        document.body
    );
}