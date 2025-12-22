import { useState, useEffect } from 'react';
import { Sparkles, Wand2, X, Plus, Edit, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutoExpandingTextarea } from '@/components/ui/auto-expanding-textarea';
import { personaService } from '@/services/personaService';
import { useBedrockService } from '@/contexts/BedrockServiceContext';
import { loadIcon } from '@/utils/iconLoader';
import type { PromptEnhancement, CustomPersona } from '@/types';

interface PersonaTrayProps {
    selectedPersona: PromptEnhancement;
    onPersonaChange: (persona: PromptEnhancement) => void;
    onClose: () => void;
}

/**
 * Built-in persona options with their visual representations
 */
const BUILT_IN_PERSONAS = [
    {
        value: 'off' as const,
        label: 'Off',
        icon: X,
        description: 'Use your prompt as-is without a persona'
    },
    {
        value: 'standard' as const,
        label: 'Standard',
        icon: Sparkles,
        description: 'Professional photographer persona with technical expertise'
    },
    {
        value: 'creative' as const,
        label: 'Creative',
        icon: Wand2,
        description: 'Artistic persona that adds creative flair and imagination'
    }
];



export function PersonaTray({ selectedPersona, onPersonaChange, onClose }: PersonaTrayProps) {
    const bedrockService = useBedrockService();
    const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingPersona, setEditingPersona] = useState<CustomPersona | null>(null);
    const [name, setName] = useState('');
    const [personaDescription, setPersonaDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingName, setIsGeneratingName] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState('Edit');
    const [errors, setErrors] = useState<{ name?: string; personaDescription?: string }>({});

    // Load custom personas when component mounts
    useEffect(() => {
        loadCustomPersonas();
    }, []);

    const loadCustomPersonas = async () => {
        try {
            const personas = await personaService.getCustomPersonas();
            setCustomPersonas(personas);
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
        setPersonaDescription(personaService.extractPersonaDescription(persona.systemPrompt));
        setSelectedIcon(persona.icon || 'Edit');
        setErrors({});
        setIsCreating(true);
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
            await loadCustomPersonas();
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
            await loadCustomPersonas();

            // If this was a new persona, select it
            if (!editingPersona) {
                onPersonaChange(persona.id);
            }

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
        <div className="px-2 pb-3 border-t border-border/30 mt-2 max-h-[40vh] overflow-y-auto">
            {!isCreating ? (
                // Persona selection view
                <div className="flex flex-wrap items-start justify-center gap-2 py-2">
                    {/* Built-in personas */}
                    {BUILT_IN_PERSONAS.map((persona) => {
                        const IconComponent = persona.icon;
                        return (
                            <button
                                key={persona.value}
                                onClick={() => handlePersonaSelect(persona.value)}
                                className={`flex flex-col items-center gap-2 p-3 min-w-[80px] max-w-[100px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors ${selectedPersona === persona.value
                                    ? 'bg-white/10 border border-transparent'
                                    : 'border border-transparent hover:border-border'
                                    }`}
                                aria-label={`Select persona ${persona.label}: ${persona.description}`}
                                title={persona.description}
                            >
                                <div className="flex items-center justify-center h-8">
                                    <IconComponent className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-medium text-center leading-tight">
                                    {persona.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* Custom personas */}
                    {customPersonas.map((persona) => {
                        const PersonaIcon = loadIcon(persona.icon || 'Edit');
                        return (
                            <div
                                key={persona.id}
                                className={`group relative flex flex-col items-center gap-2 p-3 min-w-[80px] max-w-[100px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors ${selectedPersona === persona.id
                                    ? 'bg-white/10 border border-transparent'
                                    : 'border border-transparent hover:border-border'
                                    }`}
                                onClick={() => handlePersonaSelect(persona.id)}
                                title={persona.description}
                            >
                                <div className="flex items-center justify-center h-8">
                                    <PersonaIcon className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-medium text-center leading-tight">
                                    {persona.name}
                                </span>

                                {/* Edit and delete buttons */}
                                <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleEditPersona(persona, e)}
                                        className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs"
                                        title="Edit persona"
                                    >
                                        <Edit className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeletePersona(persona, e)}
                                        className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs"
                                        title="Delete persona"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
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
                            <AutoExpandingTextarea
                                id="persona-description"
                                value={personaDescription}
                                onChange={(e) => setPersonaDescription(e.target.value)}
                                placeholder="Describe the persona's style and characteristics..."
                                className={`w-full p-3 text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none placeholder:text-neutral-200/60 placeholder:italic rounded-md ${errors.personaDescription ? 'border border-red-500' : 'border border-white/20'}`}
                                style={{ minHeight: '100px' }}
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