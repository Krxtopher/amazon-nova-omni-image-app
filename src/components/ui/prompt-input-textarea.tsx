import * as React from "react"
import { cn } from "@/lib/utils"

interface PromptInputTextAreaProps extends React.ComponentProps<"textarea"> {
    maxHeight?: number;
    forceExpanded?: boolean;
}

interface PromptInputTextAreaRef extends HTMLTextAreaElement {
    collapseTextarea: () => void;
}

const PromptInputTextArea = React.forwardRef<
    PromptInputTextAreaRef,
    PromptInputTextAreaProps
>(({ className, maxHeight, forceExpanded, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [calculatedMaxHeight, setCalculatedMaxHeight] = React.useState<number | undefined>(maxHeight);
    const [isFocused, setIsFocused] = React.useState(false);
    const [twoLineHeight, setTwoLineHeight] = React.useState<number>(48); // Default 2-line height

    // Combine refs and expose collapseTextarea method
    React.useImperativeHandle(ref, () => ({
        ...textareaRef.current!,
        collapseTextarea
    }));

    // Calculate max height based on viewport if not provided
    React.useEffect(() => {
        if (maxHeight) {
            setCalculatedMaxHeight(maxHeight);
            return;
        }

        const calculateMaxHeight = () => {
            // Get the textarea's position relative to viewport
            if (textareaRef.current) {
                const rect = textareaRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                // Leave some padding at the bottom (e.g., 100px for other UI elements)
                const availableHeight = viewportHeight - rect.top - 100;
                setCalculatedMaxHeight(Math.max(120, availableHeight)); // Minimum 120px
            }
        };

        calculateMaxHeight();
        window.addEventListener('resize', calculateMaxHeight);
        return () => window.removeEventListener('resize', calculateMaxHeight);
    }, [maxHeight]);

    // Calculate two-line height on mount
    React.useEffect(() => {
        const calculateTwoLineHeight = () => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            // Create a temporary textarea to measure 2 lines
            const tempTextarea = document.createElement('textarea');
            tempTextarea.style.cssText = window.getComputedStyle(textarea).cssText;
            tempTextarea.style.position = 'absolute';
            tempTextarea.style.visibility = 'hidden';
            tempTextarea.style.height = 'auto';
            tempTextarea.value = 'Line 1\nLine 2';
            document.body.appendChild(tempTextarea);

            const height = tempTextarea.scrollHeight;
            setTwoLineHeight(height);

            document.body.removeChild(tempTextarea);
        };

        if (textareaRef.current) {
            calculateTwoLineHeight();
        }
    }, []);

    // Auto-resize function
    const autoResize = React.useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Store the current scroll position
        const scrollTop = textarea.scrollTop;

        // Reset height to get the correct scrollHeight
        textarea.style.height = '0px';

        // Get the actual content height
        const scrollHeight = textarea.scrollHeight;

        // If not focused and content is more than 2 lines, limit to 2 lines
        let targetHeight;
        if (!isFocused && scrollHeight > twoLineHeight) {
            targetHeight = twoLineHeight;
        } else {
            // Calculate new height (minimum single line height)
            targetHeight = Math.min(
                Math.max(scrollHeight, 24), // Minimum ~24px for single line
                calculatedMaxHeight || 200
            );
        }

        // Set the new height
        textarea.style.height = `${targetHeight}px`;

        // Restore scroll position
        textarea.scrollTop = scrollTop;
    }, [calculatedMaxHeight, isFocused, twoLineHeight]);

    // Auto-resize on value change
    React.useEffect(() => {
        autoResize();
    }, [props.value, autoResize]);

    // Auto-resize on mount and when textarea ref changes
    React.useEffect(() => {
        if (textareaRef.current) {
            autoResize();
        }
    }, [autoResize]);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        autoResize();
        props.onInput?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(true);
        props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        // Only collapse if not forced to stay expanded
        if (!forceExpanded) {
            setIsFocused(false);
        }
        props.onBlur?.(e);
    };

    // Function to manually collapse the textarea (for use after form submission)
    const collapseTextarea = React.useCallback(() => {
        setIsFocused(false);
    }, []);

    // Update isFocused based on forceExpanded prop
    React.useEffect(() => {
        if (forceExpanded) {
            setIsFocused(true);
        } else if (forceExpanded === false) {
            // Only collapse if forceExpanded is explicitly false (not undefined)
            // and the textarea doesn't currently have focus
            if (!textareaRef.current || textareaRef.current !== document.activeElement) {
                setIsFocused(false);
            }
        }
    }, [forceExpanded]);

    // Check if content needs truncation (more than 2 lines when not focused)
    const needsTruncation = React.useMemo(() => {
        if (!textareaRef.current || isFocused) return false;

        // Create a temporary element to measure full content height
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = window.getComputedStyle(textareaRef.current).cssText;
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.height = 'auto';
        tempDiv.style.whiteSpace = 'pre-wrap';
        tempDiv.textContent = props.value as string || '';

        document.body.appendChild(tempDiv);
        const fullHeight = tempDiv.scrollHeight;
        document.body.removeChild(tempDiv);

        return fullHeight > twoLineHeight;
    }, [props.value, isFocused, twoLineHeight]);

    // Get truncated text for display (first two lines)
    const truncatedText = React.useMemo(() => {
        if (!needsTruncation) return props.value;

        const text = props.value as string || '';
        const lines = text.split('\n');

        if (lines.length <= 2) {
            return text;
        }

        // Take first two lines
        let firstTwoLines = lines.slice(0, 2).join('\n');

        // Add ellipsis to indicate more content if there are more than 2 lines
        if (lines.length > 2) {
            // If the second line exists, add ellipsis to it
            if (lines[1] !== undefined) {
                firstTwoLines = lines[0] + '\n' + lines[1] + '...';
            } else {
                firstTwoLines += '...';
            }
        }

        return firstTwoLines;
    }, [props.value, needsTruncation]);

    // Extract flex classes from className to apply to wrapper
    const flexClasses = React.useMemo(() => {
        if (!className) return '';
        const classes = className.split(' ');
        const flexClassList = classes.filter(cls =>
            cls.startsWith('flex-') || cls === 'flex' || cls.startsWith('grow') || cls.startsWith('shrink')
        );
        return flexClassList.join(' ');
    }, [className]);

    // Remove flex classes from textarea className
    const textareaClassName = React.useMemo(() => {
        if (!className) return '';
        const classes = className.split(' ');
        const nonFlexClasses = classes.filter(cls =>
            !cls.startsWith('flex-') && cls !== 'flex' && !cls.startsWith('grow') && !cls.startsWith('shrink')
        );
        return nonFlexClasses.join(' ');
    }, [className]);

    return (
        <div className={cn("relative", flexClasses)}>
            <textarea
                {...props}
                ref={textareaRef}
                onInput={handleInput}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none overflow-hidden",
                    textareaClassName
                )}
                style={{
                    maxHeight: calculatedMaxHeight ? `${calculatedMaxHeight}px` : undefined,
                    overflowY: calculatedMaxHeight && textareaRef.current && textareaRef.current.scrollHeight > calculatedMaxHeight ? 'auto' : 'hidden',
                    ...props.style
                }}
            />

            {/* Overlay for truncated text when not focused */}
            {needsTruncation && (
                <div
                    className={cn(
                        "absolute inset-0 flex w-full rounded-md bg-background px-3 py-2 text-base md:text-sm pointer-events-none whitespace-pre-wrap overflow-hidden",
                        textareaClassName
                    )}
                    style={{
                        color: props.value ? 'inherit' : 'var(--muted-foreground)',
                        height: `${twoLineHeight}px`,
                        ...props.style
                    }}
                >
                    {truncatedText}
                </div>
            )}
        </div>
    )
})

PromptInputTextArea.displayName = "PromptInputTextArea"

export { PromptInputTextArea }