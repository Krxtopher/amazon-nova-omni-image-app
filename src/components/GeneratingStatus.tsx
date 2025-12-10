import { Loader2 } from 'lucide-react';

interface GeneratingStatusProps {
    activeRequests: number;
}

/**
 * GeneratingStatus Component
 * 
 * Displays the "Generating X images" message at the bottom of the screen
 * when image generation is in progress. This component is positioned
 * independently of the input area to avoid pushing it down.
 */
export function GeneratingStatus({ activeRequests }: GeneratingStatusProps) {
    if (activeRequests === 0) {
        return null;
    }

    return (
        <div
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-background/80 backdrop-blur-md backdrop-saturate-150 border border-border rounded-lg p-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.16)]"
            role="status"
            aria-live="polite"
        >
            <Loader2 className="h-4 w-4 animate-spin text-foreground" aria-hidden="true" />
            <p className="text-sm text-foreground font-medium">
                Generating {activeRequests} {activeRequests === 1 ? 'image' : 'images'}...
            </p>
        </div>
    );
}