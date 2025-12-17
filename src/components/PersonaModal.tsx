import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { personaService } from '@/services/personaService';
import type { CustomPersona } from '@/types';

interface PersonaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (persona: CustomPersona) => void;
    editingPersona?: CustomPersona | null;
}

const DEFAULT_SYSTEM_PROMPT = `You are a creative persona with a unique artistic style. Your task is to take a user's image generation prompt and enhance it while preserving the original intent.

Guidelines for enhancement:
- Keep the core subject and concept intact
- Add your own creative flair and artistic vision
- Include detailed descriptions that match your style
- Enhance with appropriate technical and artistic terms
- Maintain the original mood and intent
- Make the prompt more vivid and engaging

Return only the enhanced prompt, nothing else.`;

export function PersonaModal({ isOpen, onClose, onSave, editingPersona }: PersonaModalProps) {
    const [name, setName] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; systemPrompt?: string }>({});

    // Reset form when modal opens/closes or editing persona changes
    useEffect(() => {
        if (isOpen) {
            if (editingPersona) {
                setName(editingPersona.name);
                setSystemPrompt(editingPersona.systemPrompt);
            } else {
                setName('');
                setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
            }
            setErrors({});
        }
    }, [isOpen, editingPersona]);

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.trim().length > 50) {
            newErrors.name = 'Name must be 50 characters or less';
        }

        if (!systemPrompt.trim()) {
            newErrors.systemPrompt = 'System prompt is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setIsSaving(true);

            let persona: CustomPersona;
            if (editingPersona) {
                // Update existing persona
                const updated = await personaService.updateCustomPersona(editingPersona.id, {
                    name: name.trim(),
                    systemPrompt: systemPrompt.trim()
                });
                if (!updated) {
                    throw new Error('Failed to update persona');
                }
                persona = updated;
            } else {
                // Create new persona
                persona = await personaService.createCustomPersona(
                    name.trim(),
                    systemPrompt.trim(),
                    'Custom persona' // Use a default description
                );
            }

            onSave(persona);
            onClose();
        } catch (error) {
            console.error('Failed to save persona:', error);
            // Could show a toast error here
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const handleReset = () => {
        if (editingPersona) {
            setName(editingPersona.name);
            setSystemPrompt(editingPersona.systemPrompt);
        } else {
            setName('');
            setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        }
        setErrors({});
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {editingPersona ? 'Edit Persona' : 'Create Persona'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto flex flex-col gap-4 p-1">
                    {/* System prompt field */}
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="persona-prompt">System Prompt</Label>
                        <textarea
                            id="persona-prompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Describe how this AI persona should enhance prompts..."
                            className={`w-full h-64 p-3 border rounded-md resize-none ${errors.systemPrompt ? 'border-red-500' : 'border-input'} bg-background text-sm`}
                        />
                        {errors.systemPrompt && (
                            <p className="text-sm text-red-500">{errors.systemPrompt}</p>
                        )}
                    </div>

                    {/* Name field */}
                    <div className="space-y-2">
                        <Label htmlFor="persona-name">Name</Label>
                        <Input
                            id="persona-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Fantasy Artist, Technical Writer"
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isSaving}
                    >
                        Reset
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
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : (editingPersona ? 'Update' : 'Create')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}