import { Button } from '@/components/ui/button';
import { Dice5 } from 'lucide-react';
import type { AspectRatio } from '@/types';

interface AspectRatioSelectorProps {
    selectedAspectRatio: AspectRatio;
    onAspectRatioChange: (ratio: AspectRatio) => void;
    disabled?: boolean;
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
}

/**
 * Available aspect ratio options with their visual representations
 */
const ASPECT_RATIOS: { value: AspectRatio; label: string; width: number; height: number }[] = [
    { value: 'random', label: 'Any', width: 20, height: 20 },
    { value: '2:1', label: '2:1', width: 24, height: 12 },
    { value: '16:9', label: '16:9', width: 24, height: 13.5 },
    { value: '3:2', label: '3:2', width: 24, height: 16 },
    { value: '4:3', label: '4:3', width: 24, height: 18 },
    { value: '1:1', label: '1:1', width: 20, height: 20 },
    { value: '3:4', label: '3:4', width: 18, height: 24 },
    { value: '2:3', label: '2:3', width: 16, height: 24 },
    { value: '9:16', label: '9:16', width: 13.5, height: 24 },
    { value: '1:2', label: '1:2', width: 12, height: 24 },
];

/**
 * Get the visual representation data for an aspect ratio
 */
const getAspectRatioData = (ratio: AspectRatio) => {
    return ASPECT_RATIOS.find(r => r.value === ratio) || ASPECT_RATIOS[0];
};

/**
 * AspectRatioSelector Component
 * 
 * A custom aspect ratio selector that shows the current aspect ratio with a visual rectangle
 * and triggers the parent's expanded state when clicked.
 */
export function AspectRatioSelector({
    selectedAspectRatio,
    onAspectRatioChange: _onAspectRatioChange,
    disabled,
    isExpanded = false,
    onExpandedChange
}: AspectRatioSelectorProps) {
    const currentRatio = getAspectRatioData(selectedAspectRatio);

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
            aria-label={`Current aspect ratio: ${currentRatio.label}. Click to ${isExpanded ? 'close' : 'open'} options`}
            aria-expanded={isExpanded}
        >
            {/* Visual rectangle representation */}
            <div className="flex items-center justify-center">
                {selectedAspectRatio === 'random' ? (
                    <Dice5 className="h-4 w-4" />
                ) : (
                    <div
                        className="border border-current rounded-sm bg-current/20"
                        style={{
                            width: `${Math.max(currentRatio.width * 0.75, 12)}px`,
                            height: `${Math.max(currentRatio.height * 0.75, 12)}px`,
                            minWidth: '12px',
                            minHeight: '12px',
                        }}
                    />
                )}
            </div>

            {/* Label */}
            <span className="text-sm">{currentRatio.label}</span>
        </Button>
    );
}