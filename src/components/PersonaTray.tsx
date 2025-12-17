import { useState, useEffect } from 'react';
import { Sparkles, Wand2, X, Plus, Edit, Trash2 } from 'lucide-react';
import { PersonaModal } from './PersonaModal';
import { personaService } from '@/services/personaService';
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
    const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
    const [showPersonaModal, setShowPersonaModal] = useState(false);
    const [editingPersona, setEditingPersona] = useState<CustomPersona | null>(null);

    // Load custom personas when component mounts
    useEffect(() => {
        loadCustomPersonas();
    }, []);

    const loadCustomPersonas = async () => {
        try {
            const personas = await personaService.getCustomPersonas();
            setCustomPersonas(personas);
        } catch (error) {
            console.error('Failed to load custom personas:', error);
        }
    };

    const handlePersonaSelect = (personaId: PromptEnhancement) => {
        onPersonaChange(personaId);
        onClose();
    };

    const handleCreatePersona = () => {
        setEditingPersona(null);
        setShowPersonaModal(true);
    };

    const handleEditPersona = (persona: CustomPersona, event: React.MouseEvent) => {
        event.stopPropagation();
        setEditingPersona(persona);
        setShowPersonaModal(true);
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
            console.error('Failed to delete persona:', error);
        }
    };

    const handlePersonaSave = async (persona: CustomPersona) => {
        // Reload the list
        await loadCustomPersonas();

        // If this was a new persona, select it
        if (!editingPersona) {
            onPersonaChange(persona.id);
        }
    };

    return (
        <>
            <div className="px-2 pb-3 border-t border-border/30 mt-2">
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
                    {/* Built-in personas */}
                    {BUILT_IN_PERSONAS.map((persona) => {
                        const IconComponent = persona.icon;
                        return (
                            <button
                                key={persona.value}
                                onClick={() => handlePersonaSelect(persona.value)}
                                className={`flex flex-col items-center gap-2 p-3 min-w-[80px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors ${selectedPersona === persona.value
                                    ? 'bg-white/10 border border-transparent'
                                    : 'border border-transparent hover:border-border'
                                    }`}
                                aria-label={`Select persona ${persona.label}: ${persona.description}`}
                                title={persona.description}
                            >
                                <div className="flex items-center justify-center h-8">
                                    <IconComponent className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-medium whitespace-nowrap">
                                    {persona.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* Custom personas */}
                    {customPersonas.map((persona) => (
                        <div
                            key={persona.id}
                            className={`group relative flex flex-col items-center gap-2 p-3 min-w-[80px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors ${selectedPersona === persona.id
                                ? 'bg-white/10 border border-transparent'
                                : 'border border-transparent hover:border-border'
                                }`}
                            onClick={() => handlePersonaSelect(persona.id)}
                            title={persona.description}
                        >
                            <div className="flex items-center justify-center h-8">
                                <Edit className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap max-w-[70px] truncate">
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
                    ))}

                    {/* Add new persona button */}
                    <button
                        onClick={handleCreatePersona}
                        className="flex flex-col items-center gap-2 p-3 min-w-[80px] cursor-pointer rounded-lg hover:bg-accent/50 transition-colors border border-dashed border-border hover:border-primary"
                        aria-label="Create new custom persona"
                        title="Create new custom persona"
                    >
                        <div className="flex items-center justify-center h-8">
                            <Plus className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium whitespace-nowrap">
                            Add New
                        </span>
                    </button>
                </div>
            </div>

            {/* Persona creation/editing modal */}
            <PersonaModal
                isOpen={showPersonaModal}
                onClose={() => setShowPersonaModal(false)}
                onSave={handlePersonaSave}
                editingPersona={editingPersona}
            />
        </>
    );
}