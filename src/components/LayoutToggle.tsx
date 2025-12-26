import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { Columns3, Rows3 } from 'lucide-react';
import type { HTMLAttributes } from 'react';


/**
 * Fixed position layout toggle button in the top right corner
 */
export function LayoutToggle(props: HTMLAttributes<HTMLDivElement>) {
    const { layoutMode, setLayoutMode } = useUIStore();

    const handleToggle = () => {
        const newMode = layoutMode === 'vertical' ? 'horizontal' : 'vertical';
        setLayoutMode(newMode);
    };

    const Icon = layoutMode === 'vertical' ? Rows3 : Columns3;
    const label = `Switch to ${layoutMode === 'vertical' ? 'Horizontal' : 'Vertical'} Layout`;

    return (
        <div {...props}>
            <Button
                variant="ghost"
                size="icon"
                className="bg-background/80 backdrop-blur-sm hover:bg-accent"
                onClick={handleToggle}
                title={label}
                aria-label={label}
            >
                <Icon strokeWidth={1.5} className="h-4 w-4" />
            </Button>
        </div>
    );
}