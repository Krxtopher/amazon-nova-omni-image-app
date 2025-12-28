import React, { useEffect, useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface AutoExpandingTextAreaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    minHeight?: number;
    maxHeight?: number;
}

const AutoExpandingTextArea = forwardRef<HTMLTextAreaElement, AutoExpandingTextAreaProps>(
    ({ className, minHeight = 100, maxHeight = 300, ...props }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const combinedRef = ref || textareaRef;

        const adjustHeight = () => {
            const textarea = typeof combinedRef === 'function' ? textareaRef.current : combinedRef?.current;
            if (!textarea) return;

            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = 'auto';

            // Calculate the new height
            const scrollHeight = textarea.scrollHeight;
            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

            // Set the new height
            textarea.style.height = `${newHeight}px`;

            // Show/hide scrollbar based on content
            if (scrollHeight > maxHeight) {
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }
        };

        useEffect(() => {
            adjustHeight();
        }, [props.value, minHeight, maxHeight]);

        const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
            adjustHeight();
            if (props.onInput) {
                props.onInput(e);
            }
        };

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            adjustHeight();
            if (props.onChange) {
                props.onChange(e);
            }
        };

        return (
            <textarea
                className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200",
                    className
                )}
                ref={combinedRef}
                style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                    overflowY: 'hidden'
                }}
                onInput={handleInput}
                onChange={handleChange}
                {...props}
            />
        );
    }
);

AutoExpandingTextArea.displayName = "AutoExpandingTextArea";

export { AutoExpandingTextArea };