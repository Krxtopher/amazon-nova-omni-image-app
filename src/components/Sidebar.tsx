import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { sqliteService } from '@/services/sqliteService';
import { useImageStore } from '@/stores/imageStore';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import {
    Settings,
    HelpCircle,
    Palette,
    X,
    Trash2,
    Loader2,
    Columns3,
    Rows3
} from 'lucide-react';

interface SidebarProps {
    className?: string;
}

/**
 * Settings Drawer Component
 * Contains all the settings content that was previously in the modal
 */
function SettingsDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showDeleteImagesConfirm, setShowDeleteImagesConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isDeletingImages, setIsDeletingImages] = useState(false);
    const { initialize } = useImageStore();
    const { showDebugPanel, setShowDebugPanel, layoutMode, setLayoutMode } = useUIStore();

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
            onClose(); // Close the settings drawer

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
            onClose(); // Close the settings drawer

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

    return (
        <div className="w-80 h-full py-8 bg-[#3C345A] border-r border-border flex flex-col"
            style={{
                boxShadow: '0 12px 65px rgba(0, 0, 0, 0.15)'
            }}
        >
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-12">
                {/* Grid Layout Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground special-gothic-label">
                        Grid Layout
                    </h3>
                    <div className="flex flex-row items-center gap-3">
                        <ButtonGroup>
                            <Button
                                variant={layoutMode === 'vertical' ? "outlineSelected" : "outline"}
                                onClick={() => setLayoutMode('vertical')}
                                className="flex items-center gap-2"
                                aria-label="Column layout"
                            >
                                <Columns3 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={layoutMode === 'horizontal' ? "outlineSelected" : "outline"}
                                onClick={() => setLayoutMode('horizontal')}
                                className="flex items-center gap-2"
                                aria-label="Row layout"
                            >
                                <Rows3 className="h-4 w-4" />
                            </Button>
                        </ButtonGroup>
                        <Label className="text-sm text-muted-foreground">
                            {layoutMode === 'vertical' ? 'Columns' : 'Rows'}
                        </Label>
                    </div>
                </div>

                {/* Data Management Section */}
                <div className="flex flex-col items-start gap-4">
                    <h3 className="text-sm font-medium text-foreground special-gothic-label">
                        Data Management
                    </h3>
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteImagesConfirm(true)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
                            aria-label="Delete images only"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete All Images
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowResetConfirm(true)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
                            aria-label="Reset all data"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Reset All Data
                        </Button>
                    </div>
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

            {/* Reset Confirmation Dialog */}
            {showResetConfirm && (
                <div className="absolute inset-0 bg-[#352E50]/60 flex items-center justify-center p-4">
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
                <div className="absolute inset-0 bg-[#352E50]/60 flex items-center justify-center p-4">
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
    );
}

/**
 * Left sidebar with Amazon Nova logo and icon-based navigation buttons
 */
export function Sidebar({ className = '' }: SidebarProps) {
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const bottomButtons = [
        {
            id: 'palette',
            icon: Palette,
            label: 'Colors',
            action: () => {
                // Future: Open color picker modal
            }
        },
        {
            id: 'settings',
            icon: Settings,
            label: 'Settings',
            action: () => {
                setIsSettingsOpen(true);
            }
        },
        {
            id: 'help',
            icon: HelpCircle,
            label: 'Help',
            action: () => {
                // Future: Open help modal or documentation
            }
        }
    ];

    const handleButtonClick = (buttonId: string, action: () => void) => {
        // Toggle behavior: if clicking the same button, deactivate it
        if (activeButton === buttonId) {
            setActiveButton(null);
            // For settings, close the drawer when deactivating
            if (buttonId === 'settings') {
                setIsSettingsOpen(false);
            }
        } else {
            // Close any open drawers/modals before opening new one
            if (isSettingsOpen && buttonId !== 'settings') {
                setIsSettingsOpen(false);
            }

            setActiveButton(buttonId);
            action();
        }
    };

    return (
        <div className={`fixed left-0 top-0 h-full flex flex-row z-200 ${className}`}>
            {/* Button Area */}
            <aside
                className="bg-background border-r border-border flex flex-col items-center py-4 px-2"
                aria-label="Main navigation"
            >
                {/* Amazon Nova Logo */}
                <div className="mb-8 flex items-center justify-center">
                    <img
                        src="/AmazonNova_Symbol_Gradient_RGB.svg"
                        alt="Amazon Nova"
                        className="w-7 h-7"
                    />
                </div>

                {/* Navigation Buttons */}
                <nav className="flex flex-col gap-2 flex-1">
                    {/* Spacer to push bottom buttons down */}
                    <div className="flex-1" />

                    {/* Bottom buttons - Colors, Settings, Help */}
                    {bottomButtons.map((button) => {
                        const Icon = button.icon;
                        const isActive = activeButton === button.id || (button.id === 'settings' && isSettingsOpen);

                        return (
                            <Button
                                key={button.id}
                                variant="ghost"
                                size="icon"
                                className={`${isActive ? 'bg-white/20 text-foreground' : ''} hover:bg-white/10 flex items-center justify-center [&_svg]:size-5!`}
                                onClick={() => handleButtonClick(button.id, button.action)}
                                title={button.label}
                                aria-label={button.label}
                            >
                                <Icon strokeWidth={1.5} />
                            </Button>
                        );
                    })}
                </nav>
            </aside>

            {/* Settings Drawer */}
            <SettingsDrawer
                isOpen={isSettingsOpen}
                onClose={() => {
                    setIsSettingsOpen(false);
                    setActiveButton(null);
                }}
            />
        </div>
    );
}