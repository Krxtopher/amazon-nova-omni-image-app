import { useEffect, useRef, useState } from 'react';
import type { DisplayWord, StreamingDisplayAccessibilitySettings } from '../types';

interface WordRevealContainerProps {
    words: DisplayWord[];
    isActive: boolean;
    showCursor?: boolean;
    className?: string;
    enableAnimations?: boolean;
    accessibilitySettings?: StreamingDisplayAccessibilitySettings;
}

/**
 * Component that renders individual words with fade-in animations
 * Handles word visibility state and animation coordination with accessibility support
 */
export function WordRevealContainer({
    words,
    isActive,
    showCursor = true,
    className = '',
    enableAnimations = true,
    accessibilitySettings = {
        reduceMotion: false,
        enableScreenReaderAnnouncements: true,
        skipAnimations: false,
        useInstantDisplay: false,
        announceProgress: true,
        useHighContrastIndicators: false,
    }
}: WordRevealContainerProps) {
    const [animatingWords, setAnimatingWords] = useState<Set<number>>(new Set());
    const [lastAnnouncedIndex, setLastAnnouncedIndex] = useState<number>(-1);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const liveRegionRef = useRef<HTMLDivElement>(null);

    // Determine if animations should be disabled based on settings
    const shouldSkipAnimations = !enableAnimations ||
        accessibilitySettings.skipAnimations ||
        accessibilitySettings.reduceMotion ||
        (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    // Screen reader announcements for display progress
    useEffect(() => {
        if (!accessibilitySettings.enableScreenReaderAnnouncements || !accessibilitySettings.announceProgress) {
            return;
        }

        const visibleWords = words.filter(word => word.isVisible);
        const currentIndex = visibleWords.length - 1;

        // Announce progress periodically (every 5 words or at completion)
        if (currentIndex > lastAnnouncedIndex && (currentIndex % 5 === 0 || currentIndex === words.length - 1)) {
            const announcement = isActive
                ? `Revealing word ${currentIndex + 1} of ${words.length}`
                : `Text revelation complete. ${words.length} words displayed.`;

            if (liveRegionRef.current) {
                liveRegionRef.current.textContent = announcement;
            }

            setLastAnnouncedIndex(currentIndex);
        }
    }, [words, isActive, lastAnnouncedIndex, accessibilitySettings.enableScreenReaderAnnouncements, accessibilitySettings.announceProgress]);

    // Handle word fade-in animations using requestAnimationFrame for smooth performance
    // This ensures fade-in effects don't overlap or interfere with each other
    useEffect(() => {
        // Skip animations if disabled by accessibility settings
        if (shouldSkipAnimations) {
            return;
        }

        const newAnimatingWords = new Set<number>();

        words.forEach((word, index) => {
            if (word.isVisible && !word.hasAnimated) {
                newAnimatingWords.add(index);
            }
        });

        if (newAnimatingWords.size > 0) {
            // Use requestAnimationFrame for smooth animation coordination
            // This prevents animations from blocking the main thread
            animationFrameRef.current = requestAnimationFrame(() => {
                setAnimatingWords(newAnimatingWords);

                // Schedule cleanup of animation state after fade-in duration
                // Add small buffer to ensure animation completes before cleanup
                const maxDuration = Math.max(...Array.from(newAnimatingWords).map(i => words[i]?.fadeInDuration || 0));
                setTimeout(() => {
                    setAnimatingWords(prev => {
                        const updated = new Set(prev);
                        newAnimatingWords.forEach(index => updated.delete(index));
                        return updated;
                    });
                }, maxDuration + 50); // Buffer prevents interference between animations
            });
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [words, shouldSkipAnimations]);

    // Clean up animation frame on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <>
            {/* Screen reader live region for announcements */}
            {accessibilitySettings.enableScreenReaderAnnouncements && (
                <div
                    ref={liveRegionRef}
                    className="sr-only"
                    aria-live="polite"
                    aria-atomic="false"
                />
            )}

            <div
                ref={containerRef}
                className={`inline-block relative ${className}`}
                role="status"
                aria-live={accessibilitySettings.enableScreenReaderAnnouncements ? "polite" : "off"}
                aria-label={isActive ? "Text is being revealed word by word" : "Text revelation complete"}
                aria-busy={isActive}
            >
                <span className="inline leading-relaxed">
                    {words.map((word, index) => {
                        const isAnimating = animatingWords.has(index) && !shouldSkipAnimations;
                        const shouldShow = word.isVisible;

                        return (
                            <span
                                key={index}
                                className={`inline relative ${shouldShow ? 'opacity-100' : 'opacity-0'} ${accessibilitySettings.useHighContrastIndicators && isAnimating ? 'bg-yellow-200 dark:bg-yellow-800' : ''
                                    }`}
                                style={{
                                    transition: isAnimating ? `opacity ${word.fadeInDuration}ms ease-in-out` : 'none',
                                    // Use GPU acceleration for smooth fade effects (only if animations enabled)
                                    transform: shouldSkipAnimations ? 'none' : 'translateZ(0)',
                                    backfaceVisibility: shouldSkipAnimations ? 'visible' : 'hidden',
                                    perspective: shouldSkipAnimations ? 'none' : '1000px',
                                    willChange: isAnimating ? 'opacity' : 'auto'
                                }}
                                data-word-index={index}
                                aria-label={isAnimating ? `Revealing word: ${word.text}` : undefined}
                            >
                                {word.text}
                                {index < words.length - 1 ? ' ' : ''}
                            </span>
                        );
                    })}

                    {/* Typing cursor/indicator for active display */}
                    {isActive && showCursor && (
                        <span
                            className={`inline-block font-normal ml-0.5 text-muted-foreground ${shouldSkipAnimations ? '' : 'animate-pulse'
                                } ${accessibilitySettings.useHighContrastIndicators ? 'text-black dark:text-white font-bold' : ''
                                }`}
                            style={{
                                animation: shouldSkipAnimations ? 'none' : 'blink 1s infinite'
                            }}
                            aria-hidden="true"
                            role="presentation"
                        >
                            |
                        </span>
                    )}
                </span>

                {/* CSS for blink animation - only if animations are enabled */}
                {!shouldSkipAnimations && (
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            @keyframes blink {
                                0%, 50% { opacity: 1; }
                                51%, 100% { opacity: 0; }
                            }
                        `
                    }} />
                )}
            </div>
        </>
    );
}

export default WordRevealContainer;