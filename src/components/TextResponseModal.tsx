import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface TextResponseModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalPrompt: string;
}

/**
 * Modal component for displaying a helpful message when the AI model
 * returns text instead of an image, along with the original prompt
 */
export function TextResponseModal({ isOpen, onClose, originalPrompt }: TextResponseModalProps) {
    // Truncate the prompt to first few lines (max 3 lines, ~150 characters)
    const truncatePrompt = (prompt: string): string => {
        if (!prompt) return '';

        const lines = prompt.split('\n');
        const firstThreeLines = lines.slice(0, 3).join('\n');

        if (firstThreeLines.length > 150) {
            return firstThreeLines.substring(0, 147) + '...';
        }

        if (lines.length > 3) {
            return firstThreeLines + '...';
        }

        return firstThreeLines;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Unable to Generate Image</DialogTitle>
                    <DialogDescription>
                        I'm sorry. I'm having trouble interpreting the following text as an image request. Try adding a phrase like "Create an image of..." at the beginning.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground italic">
                        {truncatePrompt(originalPrompt)}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
