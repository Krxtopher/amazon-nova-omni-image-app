import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, X, Edit } from 'lucide-react';
import { personaService } from '@/services/personaService';
import type { PromptEnhancement } from '@/types';

interface PersonaSelectorProps {
    selectedPersona: PromptEnhancement;
    onPersonaChange: (persona: PromptEnhancement) => void;
    disabled?: boolean;
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
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

/**
 * Get the persona data for display
 */
const getPersonaDisplayData = async (personaId: PromptEnhancement) => {
    const builtIn = BUILT_IN_PERSONAS.find(p => p.value === personaId);
    if (builtIn) {
        return {
            label: builtIn.label,
            description: builtIn.description,
            icon: builtIn.icon
        };
    }

    // Custom persona
    const info = await personaService.getPersonaInfo(personaId);
    return {
        label: info?.label || 'Custom',
        description: info?.description || 'Custom persona',
        icon: Edit // Use Edit icon for custom personas
    };
};

export function PersonaSelector({
    selectedPersona,
    onPersonaChange: _onPersonaChange,
    disabled,
    isExpanded = false,
    onExpandedChange
}: PersonaSelectorProps) {
    const [currentPersonaData, setCurrentPersonaData] = useState({
        label: 'Off',
        description: 'Use your prompt as-is without a persona',
        icon: X
    });

    // Load current persona display data
    useEffect(() => {
        const loadPersonaData = async () => {
            const data = await getPersonaDisplayData(selectedPersona);
            setCurrentPersonaData(data);
        };
        loadPersonaData();
    }, [selectedPersona]);

    const handleToggle = () => {
        if (!disabled && onExpandedChange) {
            onExpandedChange(!isExpanded);
        }
    };

    const CurrentIcon = currentPersonaData.icon;

    return (
        <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={handleToggle}
            className={`h-8 px-3 gap-2 text-base font-medium hover:bg-accent/50 transition-colors ${isExpanded ? 'bg-accent/50' : ''
                }`}
            aria-label={`Current persona: ${currentPersonaData.label}. Click to ${isExpanded ? 'close' : 'open'
                } options`}
            aria-expanded={isExpanded}
        >
            {/* Icon representation */}
            <div className="flex items-center justify-center">
                <CurrentIcon className="h-4 w-4" />
            </div>

            {/* Label */}
            <span className="text-sm">{currentPersonaData.label}</span>
        </Button>
    );
}