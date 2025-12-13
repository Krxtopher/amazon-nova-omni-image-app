import { useState } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';

interface TextCardProps {
    id: string;
    content: string;
    prompt: string;
    createdAt: Date;
    onDelete: (id: string) => void;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * TextCard component for displaying text responses in the gallery grid
 * Maintains square aspect ratio and provides copy/delete functionality
 */
export function TextCard({
    id,
    content,
    prompt,
    createdAt,
    onDelete,
    className = '',
    style
}: TextCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    };

    const handleDelete = () => {
        onDelete(id);
    };

    return (
        <div
            className={`relative bg-card border rounded-lg overflow-hidden group ${className}`}
            style={style}
        >
            {/* Square aspect ratio container */}
            <div className="aspect-square relative">
                {/* Content area with scrolling */}
                <div className="absolute inset-0 p-4 overflow-y-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </div>

                {/* Gradient overlay at bottom for fade effect */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />

                {/* Action buttons overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCopy}
                        className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        title="Copy text"
                    >
                        {copied ? (
                            <Check className="h-3 w-3 text-green-600" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                        title="Delete"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Footer with prompt and timestamp */}
            <div className="p-3 border-t bg-muted/50">
                <p className="text-xs text-muted-foreground truncate mb-1" title={prompt}>
                    {prompt}
                </p>
                <p className="text-xs text-muted-foreground">
                    {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>
        </div>
    );
}