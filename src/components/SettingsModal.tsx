import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { sqliteService } from '@/services/sqliteService';
import { useImageStore } from '@/stores/imageStore';
import { useUIStore } from '@/stores/uiStore';
import { ThrottlingSettings, type ThrottlingSettingsRef } from '@/components/ThrottlingSettings';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

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
    const [showDeleteImagesConfirm, setShowDeleteImagesConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isDeletingImages, setIsDeletingImages] = useState(false);
    const [hasThrottlingChanges, setHasThrottlingChanges] = useState(false);
    const { initialize } = useImageStore();
    const { showDebugPanel, setShowDebugPanel } = useUIStore();
    const throttlingRef = useRef<ThrottlingSettingsRef>(null);

    // Lock body scrolling when modal is open
    useBodyScrollLock(isOpen);

    /**
     * Handle the reset action
     */
    const handleReset = async () => {
        setIsResetting(true);
        try {
            // Clear all data from SQLite
            await sqliteService.clearAll();

            // Clear text items from localStorage
            localStorage.removeItem('textItems');

            // Reinitialize the store with empty data
            await initialize();

            setShowResetConfirm(false);
            onClose(); // Close the settings modal

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

    /**
     * Handle deleting images only (preserve settings and personas)
     */
    const handleDeleteImages = async () => {
        setIsDeletingImages(true);
        try {
            // Delete all image metadata and data from SQLite
            await sqliteService.deleteAllImages();

            // Clear text items from localStorage
            localStorage.removeItem('textItems');

            // Reinitialize the store (this will reload settings and personas but clear images)
            await initialize();

            setShowDeleteImagesConfirm(false);
            onClose(); // Close the settings modal

            // Show success notification
            toast.success('All images have been deleted', {
                duration: 3000,
            });
        } catch (error) {
            toast.error('Failed to delete images. Please try again.', {
                duration: 3000,
            });
        } finally {
            setIsDeletingImages(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 bg-[#352E50]/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#3C345A]/65 backdrop-blur-md border border-border rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col transition-all duration-200"
                style={{
                    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)'
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="settings-modal-title"
                aria-describedby="settings-modal-description"
            >
                {/* Fixed Header */}
                <div className="flex items-center justify-between p-2 px-6 border-b border-border shrink-0">
                    <h2
                        id="settings-modal-title"
                        className="text-lg font-semibold text-foreground special-gothic-label"
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

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-10">
                    {/* Data Management Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground special-gothic-label">
                            Data Management
                        </h3>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteImagesConfirm(true)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                aria-label="Delete images only"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete All Images
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowResetConfirm(true)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                aria-label="Reset all data"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Reset All Data
                            </Button>
                        </div>
                    </div>


                    {/* Throttling Settings Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground special-gothic-label">
                            API Request Throttling
                        </h3>
                        <ThrottlingSettings
                            ref={throttlingRef}
                            onHasUnsavedChanges={setHasThrottlingChanges}
                        />
                    </div>

                    {/* Debug Panel Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground special-gothic-label">
                            Developer Options
                        </h3>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="debug-panel-toggle">Show Debug Panel</Label>
                            </div>
                            <Switch
                                id="debug-panel-toggle"
                                checked={showDebugPanel}
                                onCheckedChange={setShowDebugPanel}
                            />
                        </div>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="border-t border-border px-6 py-2 shrink-0">
                    <div className="flex items-center justify-end">
                        {/* <Button
                            variant="outline"
                            onClick={() => throttlingRef.current?.reset()}
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset to Defaults
                        </Button> */}

                        <div className="flex items-center gap-2">
                            {hasThrottlingChanges && (
                                <Button
                                    variant="ghost"
                                    onClick={() => throttlingRef.current?.discard()}
                                >
                                    Discard Changes
                                </Button>
                            )}
                            <Button
                                onClick={() => throttlingRef.current?.save()}
                                disabled={!hasThrottlingChanges}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
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
                                    className="text-lg font-semibold text-foreground special-gothic-label"
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

                {/* Delete Images Confirmation Dialog */}
                {showDeleteImagesConfirm && (
                    <div
                        className="absolute inset-0 bg-[#352E50]/60 flex items-center justify-center p-4 rounded-2xl"
                        onClick={() => !isDeletingImages && setShowDeleteImagesConfirm(false)}
                    >
                        <div
                            className="bg-[#3C345A]/65 backdrop-blur-md border border-border rounded-2xl max-w-sm w-full p-6 space-y-4 transition-all duration-200"
                            style={{
                                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-labelledby="delete-images-dialog-title"
                            aria-describedby="delete-images-dialog-description"
                        >
                            <div className="space-y-2">
                                <h3
                                    id="delete-images-dialog-title"
                                    className="text-lg font-semibold text-foreground special-gothic-label"
                                >
                                    Delete All Images?
                                </h3>
                                <p
                                    id="delete-images-dialog-description"
                                    className="text-sm text-muted-foreground"
                                >
                                    This will permanently delete all your generated images but keep your settings and custom personas.
                                    This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteImagesConfirm(false)}
                                    disabled={isDeletingImages}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteImages}
                                    disabled={isDeletingImages}
                                >
                                    {isDeletingImages && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {isDeletingImages ? 'Deleting...' : 'Delete Images'}
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