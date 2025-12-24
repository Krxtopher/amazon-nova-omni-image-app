import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { personaService } from '@/services/personaService';
import { loadIcon } from '@/utils/iconLoader';
import type { PromptEnhancement } from '@/types';

interface PersonaSelectorProps {
    selectedPersona: PromptEnhancement;
    onPersonaChange: (persona: PromptEnhancement) => void;
    disabled?: boolean;
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
}

/**
 * Get the persona data for display using unified interface
 */
const getPersonaDisplayData = async (personaId: PromptEnhancement) => {
    const persona = await personaService.getPersona(personaId);

    if (!persona) {
        // Fallback for unknown personas
        return {
            label: 'Unknown',
            description: 'Unknown persona',
            icon: X
        };
    }

    return {
        label: persona.name,
        description: persona.description,
        icon: loadIcon(persona.icon)
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