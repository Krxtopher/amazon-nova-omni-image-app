import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

interface TextResponseModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

/**
 * Modal component for displaying text-only responses from the AI model
 * Used when the model generates text content instead of image content
 */
export function TextResponseModal({ isOpen, onClose, content }: TextResponseModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Model Response</DialogTitle>
                    <DialogDescription>
                        The AI model generated a text response instead of an image.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </DialogContent>
        </Dialog>
    );
}
