import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { sqliteService } from '@/services/sqliteService';

interface CustomPromptEnhancementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customPersona: string) => void;
}

const DEFAULT_CUSTOM_PERSONA = `You are a creative persona with a unique artistic style. Your task is to take a user's image generation prompt and enhance it while preserving the original intent.

Guidelines for enhancement:
- Keep the core subject and concept intact
- Add your own creative flair and artistic vision
- Include detailed descriptions that match your style
- Enhance with appropriate technical and artistic terms
- Maintain the original mood and intent
- Make the prompt more vivid and engaging

Return only the enhanced prompt, nothing else.`;

export function CustomPromptEnhancementModal({ isOpen, onClose, onSave }: CustomPromptEnhancementModalProps) {
    const [customPersona, setCustomPersona] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load existing custom persona when modal opens
    useEffect(() => {
        if (isOpen) {
            loadCustomPersona();
        }
    }, [isOpen]);

    const loadCustomPersona = async () => {
        try {
            setIsLoading(true);
            const savedPersona = await sqliteService.getSetting('customPromptEnhancementPersona');
            setCustomPersona((savedPersona as string) || DEFAULT_CUSTOM_PERSONA);
        } catch (error) {
            console.error('Failed to load custom persona:', error);
            setCustomPersona(DEFAULT_CUSTOM_PERSONA);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!customPersona.trim()) {
            return;
        }

        try {
            setIsSaving(true);
            await sqliteService.setSetting('customPromptEnhancementPersona', customPersona.trim());
            onSave(customPersona.trim());
            onClose();
        } catch (error) {
            console.error('Failed to save custom persona:', error);
            // Could show a toast error here
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const handleReset = () => {
        setCustomPersona(DEFAULT_CUSTOM_PERSONA);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Custom Persona</DialogTitle>
                    <DialogDescription>
                        Define your own AI persona for prompt enhancement. Describe the characteristics, style, and approach you want the AI to adopt when enhancing your prompts.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-hidden">
                                <AutoExpandingTextarea
                                    value={customPersona}
                                    onChange={(e) => setCustomPersona(e.target.value)}
                                    placeholder="Describe your custom AI persona..."
                                    className="w-full h-full min-h-[200px] resize-none"
                                    maxHeight={400}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t">
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    disabled={isSaving}
                                >
                                    Reset to Default
                                </Button>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={!customPersona.trim() || isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}