import { useState, useEffect } from 'react';
import { Sparkles, Plus, Edit, Trash2, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutoExpandingTextArea } from '@/components/ui/auto-expanding-textarea';
import { personaService } from '@/services/personaService';
import { useBedrockService } from '@/contexts/BedrockServiceContext';
import { loadIcon } from '@/utils/iconLoader';
import type { PromptEnhancement, CustomPersona, Persona } from '@/types';

interface PersonaTrayProps {
    selectedPersona: PromptEnhancement;
    onPersonaChange: (persona: PromptEnhancement) => void;
    onClose: () => void;
    onPersonaUpdated?: () => void; // Add callback for when persona is updated
}

export function PersonaTray({ selectedPersona, onPersonaChange, onClose, onPersonaUpdated }: PersonaTrayProps) {
    const bedrockService = useBedrockService();
    const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingPersona, setEditingPersona] = useState<CustomPersona | null>(null);
    const [viewingPersona, setViewingPersona] = useState<Persona | null>(null);
    const [name, setName] = useState('');
    const [personaDescription, setPersonaDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingName, setIsGeneratingName] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState('Edit');
    const [errors, setErrors] = useState<{ name?: string; personaDescription?: string }>({});

    // Load all personas when component mounts
    useEffect(() => {
        loadAllPersonas();
    }, []);

    const loadAllPersonas = async () => {
        try {
            const personas = await personaService.getAllPersonas();
            setAllPersonas(personas);
        } catch (error) {
            // Silently handle load errors
        }
    };

    const handlePersonaSelect = (personaId: PromptEnhancement) => {
        onPersonaChange(personaId);
        onClose();
    };

    const handleCreatePersona = () => {
        setEditingPersona(null);
        setName('');
        setPersonaDescription('');
        setSelectedIcon('Edit');
        setErrors({});
        setIsCreating(true);
    };

    const handleEditPersona = (persona: CustomPersona, event: React.MouseEvent) => {
        event.stopPropagation();
        setEditingPersona(persona);
        setName(persona.name);
        setPersonaDescription(persona.personaDescription);
        setSelectedIcon(persona.icon || 'Edit');
        setErrors({});
        setIsCreating(true);
    };

    const handleViewPersona = (persona: Persona, event: React.MouseEvent) => {
        event.stopPropagation();
        setViewingPersona(persona);
    };

    const handleDeletePersona = async (persona: CustomPersona, event: React.MouseEvent) => {
        event.stopPropagation();

        try {
            await personaService.deleteCustomPersona(persona.id);

            // If the deleted persona was selected, switch to 'off'
            if (selectedPersona === persona.id) {
                onPersonaChange('off');
            }

            // Reload the list
            await loadAllPersonas();
        } catch (error) {
            // Silently handle delete errors
        }
    };

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.trim().length > 50) {
            newErrors.name = 'Name must be 50 characters or less';
        }

        if (!personaDescription.trim()) {
            newErrors.personaDescription = 'Persona description is required';
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
                    personaDescription: personaDescription.trim(),
                    icon: selectedIcon
                });
                if (!updated) {
                    throw new Error('Failed to update persona');
                }
                persona = updated;
            } else {
                // Create new persona
                persona = await personaService.createCustomPersona(
                    name.trim(),
                    personaDescription.trim(),
                    'Custom persona', // Use a default description
                    selectedIcon
                );
            }

            // Reload the list
            await loadAllPersonas();

            // Notify parent that persona was updated (for PersonaSelector refresh)
            if (onPersonaUpdated) {
                onPersonaUpdated();
            }

            // Select the persona (both for new and updated personas)
            onPersonaChange(persona.id);

            // Exit editing mode
            setIsCreating(false);
            setEditingPersona(null);
        } catch (error) {
            // Could show a toast error here
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingPersona(null);
        setViewingPersona(null);
        setName('');
        setPersonaDescription('');
        setSelectedIcon('Edit');
        setErrors({});
    };

    const handleGenerateName = async () => {
        if (!personaDescription.trim()) {
            setErrors({ ...errors, personaDescription: 'Please enter a persona description first' });
            return;
        }

        try {
            setIsGeneratingName(true);
            setErrors({ ...errors, name: undefined }); // Clear any existing name errors

            // Generate both name and icon simultaneously
            const [generatedName, generatedIcon] = await Promise.all([
                bedrockService.generatePersonaName(personaDescription.trim()),
                bedrockService.generatePersonaIcon(personaDescription.trim())
            ]);

            setName(generatedName);
            setSelectedIcon(generatedIcon);
        } catch (error) {
            setErrors({
                ...errors,
                name: 'Failed to generate name and icon. Please try again or enter them manually.'
            });
        } finally {
            setIsGeneratingName(false);
        }
    };

    return (
        <div data-persona-tray className="px-2 pb-3 border-t border-border/30 mt-2 overflow-hidden">
            {!isCreating && !viewingPersona ? (
                // Persona selection view
                <div className="flex flex-wrap items-start justify-center gap-2 py-2">
                    {/* All personas (built-in and custom) */}
                    {allPersonas.map((persona) => {
                        const PersonaIcon = loadIcon(persona.icon);
                        const isSelected = selectedPersona === persona.id;

                        return (
                            <div
                                key={persona.id}
                                className={`group relative flex flex-col items-center gap-2 p-3 min-w-[80px] max-w-[100px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors ${isSelected
                                    ? 'bg-white/10 border border-transparent'
                                    : 'border border-transparent hover:border-border'
                                    }`}
                                onClick={() => handlePersonaSelect(persona.id)}
                                title={persona.shortDescription}
                                aria-label={`Select persona ${persona.name}: ${persona.shortDescription}`}
                            >
                                <div className="flex items-center justify-center h-8">
                                    <PersonaIcon className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-medium text-center leading-tight">
                                    {persona.name}
                                </span>

                                {/* Edit button - only show for editable personas */}
                                {persona.isEditable && (
                                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleEditPersona(persona as CustomPersona, e)}
                                            className="p-1 bg-white hover:bg-gray-100 text-black rounded-full text-xs shadow-sm border border-gray-200"
                                            title="Edit persona"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}

                                {/* Info button - only show for non-editable personas */}
                                {!persona.isEditable && (
                                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleViewPersona(persona, e)}
                                            className="p-1 bg-white hover:bg-gray-100 text-black rounded-full text-xs shadow-sm border border-gray-200"
                                            title="View persona details"
                                        >
                                            <Info className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add new persona button */}
                    <button
                        onClick={handleCreatePersona}
                        className="flex flex-col items-center gap-2 p-3 min-w-[80px] max-w-[100px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors border border-dashed border-border hover:border-primary"
                        aria-label="Create new custom persona"
                        title="Create new custom persona"
                    >
                        <div className="flex items-center justify-center h-8">
                            <Plus className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight">
                            Add New
                        </span>
                    </button>
                </div>
            ) : viewingPersona ? (
                // Read-only persona viewing panel
                <div className="space-y-4 py-4">
                    {/* Description and Name fields side by side */}
                    <div className="flex gap-4">
                        {/* Enhancement Instructions field - 75% width */}
                        <div className="flex-1 space-y-2">
                            {/* System Prompt - only show if it exists */}
                            {viewingPersona.personaDescription && (
                                <>
                                    <Label className="text-white/50 font-medium special-gothic-label">
                                        Enhancement Instructions
                                    </Label>
                                    <div className="p-3 bg-white/5 border border-white/20 rounded-md text-sm text-white/80 max-h-48 overflow-y-auto">
                                        <pre className="whitespace-pre-wrap font-sans">
                                            {viewingPersona.personaDescription}
                                        </pre>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Name and Icon fields - 25% width */}
                        <div className="w-1/4 space-y-2">
                            <Label className="text-white/50 font-medium special-gothic-label">
                                Name & Icon
                            </Label>
                            <div className="space-y-2">
                                <div className="p-3 bg-white/5 border border-white/20 rounded-md text-sm text-white/80">
                                    {viewingPersona.name}
                                </div>
                                {/* Icon preview */}
                                <div className="flex items-center justify-center p-3 border border-white/20 rounded-md bg-white/5">
                                    {(() => {
                                        const PreviewIcon = loadIcon(viewingPersona.icon);
                                        return <PreviewIcon className="h-6 w-6 text-white/70" />;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Close button */}
                    <div className="flex justify-end pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            ) : (
                // Inline persona creation/editing form
                <div className="space-y-4 py-4">
                    {/* Description and Name fields side by side */}
                    <div className="flex gap-4">
                        {/* Persona description field - 75% width */}
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="persona-description" className="text-white/50 font-medium special-gothic-label">
                                Persona Description
                            </Label>
                            <AutoExpandingTextArea
                                id="persona-description"
                                value={personaDescription}
                                onChange={(e) => setPersonaDescription(e.target.value)}
                                placeholder="Describe the persona's style and characteristics..."
                                className={`w-full p-3 text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none placeholder:text-neutral-200/60 placeholder:italic rounded-md ${errors.personaDescription ? 'border border-red-500' : 'border border-white/20'}`}
                                minHeight={100}
                                maxHeight={200}
                            />
                            {errors.personaDescription && (
                                <p className="text-sm text-red-500">{errors.personaDescription}</p>
                            )}
                        </div>

                        {/* Name and Icon fields - 25% width */}
                        <div className="w-1/4 space-y-2">
                            <Label htmlFor="persona-name" className="text-white/50 font-medium special-gothic-label">
                                Name & Icon
                            </Label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Input
                                        id="persona-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Fantasy Artist"
                                        className={`bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none placeholder:text-neutral-200/60 placeholder:italic pr-10 ${errors.name ? 'border border-red-500' : 'border border-white/20'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateName}
                                        disabled={isGeneratingName || !personaDescription.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Generate name and icon from description"
                                        aria-label="Generate name and icon from description"
                                    >
                                        <Sparkles
                                            className={`h-4 w-4 text-purple-400 ${isGeneratingName ? 'animate-pulse' : ''}`}
                                        />
                                    </button>
                                </div>
                                {/* Icon preview */}
                                <div className="flex items-center justify-center p-3 border border-white/20 rounded-md bg-white/5">
                                    {(() => {
                                        const PreviewIcon = loadIcon(selectedIcon);
                                        return <PreviewIcon className="h-6 w-6 text-white/70" />;
                                    })()}
                                </div>
                            </div>
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name}</p>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className={`flex items-center pt-2 ${editingPersona ? 'justify-between' : 'justify-end'}`}>
                        {editingPersona && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (editingPersona) {
                                        await handleDeletePersona(editingPersona, e);
                                        handleCancel();
                                    }
                                }}
                                disabled={isSaving}
                                className="gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        )}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving || !name.trim() || !personaDescription.trim()}
                                className="gap-2"
                            >
                                {isSaving ? (
                                    'Saving...'
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        {editingPersona ? 'Update' : 'Create'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}