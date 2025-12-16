import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Settings, X } from 'lucide-react';
import type { PromptEnhancement } from '@/types';

interface PromptEnhancementSelectorProps {
    selectedEnhancement: PromptEnhancement;
    onEnhancementChange: (enhancement: PromptEnhancement) => void;
    disabled?: boolean;
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
}

/**
 * Available prompt enhancement options with their visual representations
 */
const PROMPT_ENHANCEMENTS: {
    value: PromptEnhancement;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}[] = [
        {
            value: 'off',
            label: 'Off',
            icon: X,
            description: 'Use your prompt as-is without enhancement'
        },
        {
            value: 'standard',
            label: 'Standard',
            icon: Sparkles,
            description: 'Enhance prompt with standard improvements'
        },
        {
            value: 'creative',
            label: 'Creative',
            icon: Wand2,
            description: 'Add creative flair and artistic details'
        },
        {
            value: 'custom',
            label: 'Custom',
            icon: Settings,
            description: 'Use custom enhancement settings'
        },
    ];

/**
 * Get the enhancement data for a specific enhancement type
 */
const getEnhancementData = (enhancement: PromptEnhancement) => {
    return PROMPT_ENHANCEMENTS.find(e => e.value === enhancement) || PROMPT_ENHANCEMENTS[0];
};

/**
 * PromptEnhancementSelector Component
 * 
 * A custom prompt enhancement selector that shows the current enhancement with an icon
 * and triggers the parent's expanded state when clicked.
 */
export function PromptEnhancementSelector({
    selectedEnhancement,
    onEnhancementChange: _onEnhancementChange,
    disabled,
    isExpanded = false,
    onExpandedChange
}: PromptEnhancementSelectorProps) {
    const currentEnhancement = getEnhancementData(selectedEnhancement);

    const handleToggle = () => {
        if (!disabled && onExpandedChange) {
            onExpandedChange(!isExpanded);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={handleToggle}
            className={`h-8 px-3 gap-2 text-base font-medium hover:bg-accent/50 transition-colors ${isExpanded ? 'bg-accent/50' : ''
                }`}
            aria-label={`Current prompt enhancement: ${currentEnhancement.label}. Click to ${isExpanded ? 'close' : 'open'
                } options`}
            aria-expanded={isExpanded}
        >
            {/* Icon representation */}
            <div className="flex items-center justify-center">
                <currentEnhancement.icon className="h-4 w-4" />
            </div>

            {/* Label */}
            <span className="text-sm">{currentEnhancement.label}</span>
        </Button>
    );
}