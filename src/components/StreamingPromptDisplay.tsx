import { useEffect, useRef, useState, useCallback } from 'react';
import { StreamingPromptEnhancementService } from '../services/StreamingPromptEnhancementService';
import { WordByWordDisplayEngine } from '../utils/WordByWordDisplayEngine';
import { WordRevealContainer } from './WordRevealContainer';
import { useStreamingDisplayConfig, useWordDisplayConfig, useFeatureFlag } from '../contexts';
import { useStreamingDisplayAccessibility, useStreamingDisplayKeyboard } from '../hooks';
import { usePerformanceOptimizer } from '../utils/PerformanceOptimizer';
import { usePerformanceMonitoring } from '../services/PerformanceMonitoringService';
import type {
    PromptEnhancement,
    StreamingToken,
    DisplayWord,
    WordDisplayStatus,
    WordDisplayConfig
} from '../types';

interface StreamingPromptDisplayProps {
    originalPrompt: string;
    enhancementType: PromptEnhancement;
    onEnhancementComplete?: (enhancedPrompt: string) => void;
    onDisplayComplete?: () => void;
    className?: string;
    /** @deprecated Use StreamingDisplayConfigContext instead */
    config?: Partial<WordDisplayConfig>;
}

/**
 * Main orchestrator component that combines streaming enhancement and word-by-word display
 * Handles state management for streaming and display phases with proper cleanup
 */
export function StreamingPromptDisplay({
    originalPrompt,
    enhancementType,
    onEnhancementComplete,
    onDisplayComplete,
    className = '',
    config: legacyConfig
}: StreamingPromptDisplayProps) {
    // Configuration from context
    const { config: globalConfig } = useStreamingDisplayConfig();
    const wordDisplayConfig = useWordDisplayConfig();
    const enableStreamingEnhancement = useFeatureFlag('enableStreamingEnhancement');
    const enableWordByWordDisplay = useFeatureFlag('enableWordByWordDisplay');
    const enableFadeInAnimations = useFeatureFlag('enableFadeInAnimations');
    const enableTypingCursor = useFeatureFlag('enableTypingCursor');

    // Performance optimization hooks
    const performanceOptimizer = usePerformanceOptimizer();
    const performanceMonitoring = usePerformanceMonitoring();

    // Accessibility features
    const {
        announce,
        announceProgress,
        announceStreamingStatus,
        shouldUseInstantDisplay,
        getAccessibilityAttributes,
        getKeyboardInstructions,
    } = useStreamingDisplayAccessibility();

    // State management for streaming and display phases
    const [status, setStatus] = useState<WordDisplayStatus>('idle');
    const [displayWords, setDisplayWords] = useState<DisplayWord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [finalText, setFinalText] = useState<string>(''); // Stores the final text (enhanced or original)
    const [streamingText, setStreamingText] = useState<string>(''); // Stores the accumulating streaming text

    // Performance tracking
    const enhancementStartTimeRef = useRef<number>(0);
    const displayStartTimeRef = useRef<number>(0);

    // Service references
    const streamingServiceRef = useRef<StreamingPromptEnhancementService | null>(null);
    const displayEngineRef = useRef<WordByWordDisplayEngine | null>(null);
    const isMountedRef = useRef(true);
    const displayIdRef = useRef<string>(`display_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const isProcessingRef = useRef(false); // Prevent duplicate processing

    // Configuration - prefer context config over legacy prop config
    const displayConfig = legacyConfig ? { ...wordDisplayConfig, ...legacyConfig } : wordDisplayConfig;

    // Keyboard navigation support
    const handleSkipToEnd = useCallback(() => {
        if (displayEngineRef.current && status === 'revealing') {
            displayEngineRef.current.showInstantly(finalText);
            announce('Skipped to end of text display', 'status', 'polite');
        }
    }, [status, finalText, announce]);

    const handleTogglePause = useCallback(() => {
        // For now, we'll implement this as skip to end
        // In a more advanced implementation, we could add pause/resume functionality
        handleSkipToEnd();
    }, [handleSkipToEnd]);

    const handleAdjustSpeed = useCallback((multiplier: number) => {
        // Speed adjustment would require modifying the display engine
        // For now, we'll just announce the action
        announce(`Display speed ${multiplier > 1 ? 'increased' : 'decreased'}`, 'status', 'polite');
    }, [announce]);

    // Set up keyboard navigation
    useStreamingDisplayKeyboard(handleSkipToEnd, handleTogglePause, handleAdjustSpeed);

    // Initialize services
    useEffect(() => {
        // Only start performance monitoring once per component
        const shouldStartMonitoring = !performanceMonitoring.getDebugInfo().isMonitoring;
        if (shouldStartMonitoring) {
            performanceMonitoring.startMonitoring();
        }

        // Register display for performance tracking
        performanceOptimizer.registerDisplay(displayIdRef.current);

        // Initialize display engine
        displayEngineRef.current = new WordByWordDisplayEngine(displayConfig);

        // Initialize streaming service if we have credentials
        const initializeStreamingService = async () => {
            try {
                // Get AWS credentials from environment
                const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
                const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID || '';
                const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '';

                if (accessKeyId && secretAccessKey) {
                    streamingServiceRef.current = new StreamingPromptEnhancementService({
                        region,
                        credentials: {
                            accessKeyId,
                            secretAccessKey
                        }
                    });
                }
            } catch (error) {
                console.warn('Failed to initialize streaming service:', error);
            }
        };

        initializeStreamingService();

        return () => {
            isMountedRef.current = false;
            isProcessingRef.current = false; // Reset processing flag on unmount

            // Unregister display from performance tracking
            performanceOptimizer.unregisterDisplay(displayIdRef.current);

            // Don't stop monitoring here as other components might be using it
            // Let the performance monitoring service handle its own lifecycle
        };
    }, [performanceMonitoring, performanceOptimizer, displayConfig]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (displayEngineRef.current) {
                displayEngineRef.current.cleanup();
            }
            if (streamingServiceRef.current) {
                streamingServiceRef.current.cancelStreaming();
            }
        };
    }, []);

    // Handle word reveal from display engine
    const handleWordReveal = useCallback((word: DisplayWord, index: number) => {
        if (!isMountedRef.current) return;

        setDisplayWords(prev => {
            const updated = [...prev];
            updated[index] = { ...word, isVisible: true, hasAnimated: true };

            // Announce progress periodically
            if (globalConfig.accessibility.announceProgress && (index + 1) % 5 === 0) {
                announceProgress(index + 1, prev.length, false);
            }

            return updated;
        });
    }, [globalConfig.accessibility.announceProgress, announceProgress]);

    // Handle display completion - final state transition
    const handleDisplayComplete = useCallback(() => {
        if (!isMountedRef.current) return;

        // Record display performance
        if (displayStartTimeRef.current > 0) {
            performanceMonitoring.recordDisplayTime(displayStartTimeRef.current, performance.now());
        }

        // Display complete
        setStatus('complete');

        // Announce completion
        announceProgress(displayWords.length, displayWords.length, true);
        announceStreamingStatus('complete');

        // Call display completion callback to notify parent component
        onDisplayComplete?.();
    }, [onDisplayComplete, announceProgress, announceStreamingStatus, displayWords.length, performanceMonitoring]);

    // Handle enhancement completion - manages state transition from streaming to display
    const handleEnhancementComplete = useCallback((enhancedText: string) => {
        if (!isMountedRef.current) return;

        // Record enhancement performance
        if (enhancementStartTimeRef.current > 0) {
            performanceMonitoring.recordEnhancementTime(enhancementStartTimeRef.current, performance.now());
        }

        // Enhancement complete, transition to display
        setFinalText(enhancedText);
        setStreamingText(''); // Clear streaming text

        // Announce transition to display phase
        announceStreamingStatus('displaying');

        // Call enhancement completion callback before starting display
        onEnhancementComplete?.(enhancedText);

        // Transition from streaming phase to display phase
        startWordByWordDisplay(enhancedText);

        // Reset processing flag
        isProcessingRef.current = false;
    }, [onEnhancementComplete, announceStreamingStatus, performanceMonitoring]);

    // Handle streaming tokens - accumulate during streaming phase
    const handleStreamingToken = useCallback((token: StreamingToken) => {
        if (!isMountedRef.current) return;

        // Set status to streaming if not already
        if (status !== 'streaming') {
            setStatus('streaming');
            announceStreamingStatus('enhancing');
        }

        // Accumulate the streaming text for display
        if (token.text) {
            setStreamingText(prev => prev + token.text);
        }
    }, [status, announceStreamingStatus]);

    // Handle streaming errors - transition to fallback display
    const handleStreamingError = useCallback((errorMessage: string) => {
        if (!isMountedRef.current) return;

        console.warn('Streaming enhancement error, falling back to original prompt:', errorMessage);
        setError(errorMessage);

        // Announce error and fallback
        announceStreamingStatus('error', errorMessage);

        // Transition from streaming phase to display phase with original prompt
        setFinalText(originalPrompt);
        startWordByWordDisplay(originalPrompt);

        // Reset processing flag
        isProcessingRef.current = false;
    }, [originalPrompt, announceStreamingStatus]);

    // Start word-by-word display - Phase 2 of the process
    const startWordByWordDisplay = useCallback((text: string) => {
        if (!displayEngineRef.current || !isMountedRef.current) return;

        // Starting display phase
        displayStartTimeRef.current = performance.now();
        setStatus('revealing');
        setError(null);

        // Check if instant display should be used for accessibility
        if (shouldUseInstantDisplay()) {
            // Using instant display for accessibility
            const words = text.match(/\S+/g) || [];
            const instantWords: DisplayWord[] = words.map(wordText => ({
                text: wordText,
                delay: 0,
                fadeInDuration: 0,
                isVisible: true,
                hasAnimated: true
            }));

            setDisplayWords(instantWords);
            setStatus('complete');
            announceStreamingStatus('complete');
            onDisplayComplete?.();
            return;
        }

        // Initialize display words array
        const words = text.match(/\S+/g) || [];
        const initialWords: DisplayWord[] = words.map(wordText => ({
            text: wordText,
            delay: 0, // Will be calculated by engine
            fadeInDuration: 0, // Will be calculated by engine
            isVisible: false,
            hasAnimated: false
        }));

        setDisplayWords(initialWords);

        // Start the display engine - this will trigger word reveals and completion
        displayEngineRef.current.startDisplay(
            text,
            displayConfig,
            handleWordReveal,
            handleDisplayComplete // This will trigger final state transition
        );
    }, [displayConfig, handleWordReveal, handleDisplayComplete, shouldUseInstantDisplay, announceStreamingStatus, onDisplayComplete]);

    // Start the enhancement and display process with proper state transitions
    useEffect(() => {
        if (!originalPrompt || status !== 'idle' || isProcessingRef.current) return;

        const startProcess = async () => {
            // Prevent duplicate processing
            isProcessingRef.current = true;

            // Starting streaming prompt display process
            enhancementStartTimeRef.current = performance.now();
            setStatus('streaming');
            setError(null);
            setDisplayWords([]);
            setStreamingText(''); // Reset streaming text

            // Announce start of process
            announceStreamingStatus('starting');

            // Check if word-by-word display is disabled
            if (!enableWordByWordDisplay) {
                // Word-by-word display disabled, showing text instantly
                setFinalText(originalPrompt);
                setDisplayWords([{
                    text: originalPrompt,
                    delay: 0,
                    fadeInDuration: 0,
                    isVisible: true,
                    hasAnimated: true
                }]);
                setStatus('complete');
                announceStreamingStatus('complete');
                onDisplayComplete?.();
                return;
            }

            // Phase 1: Enhancement (or skip if not needed)
            if (enhancementType === 'off' || !enableStreamingEnhancement || !streamingServiceRef.current) {
                // Skipping enhancement, using original prompt
                setFinalText(originalPrompt);

                // Transition directly to display phase
                startWordByWordDisplay(originalPrompt);
                return;
            }

            try {
                // Starting streaming enhancement phase
                // Phase 1: Stream enhancement from Bedrock
                await streamingServiceRef.current.enhancePromptStreaming(
                    originalPrompt,
                    enhancementType,
                    handleStreamingToken,
                    handleEnhancementComplete, // This will trigger Phase 2
                    handleStreamingError
                );
            } catch (error) {
                console.error('Enhancement process failed:', error);
                handleStreamingError(error instanceof Error ? error.message : 'Enhancement failed');
            } finally {
                // Reset processing flag
                isProcessingRef.current = false;
            }
        };

        startProcess();
    }, [originalPrompt, enhancementType, status, enableWordByWordDisplay, enableStreamingEnhancement, handleStreamingToken, handleEnhancementComplete, handleStreamingError, startWordByWordDisplay, onDisplayComplete]);

    // Cancel active processes when props change
    useEffect(() => {
        return () => {
            if (displayEngineRef.current) {
                displayEngineRef.current.cancelDisplay();
            }
            if (streamingServiceRef.current) {
                streamingServiceRef.current.cancelStreaming();
            }
        };
    }, [originalPrompt, enhancementType]);

    // Show error state or loading state
    if (error && status !== 'complete') {
        return (
            <div className={`text-muted-foreground ${className}`}>
                <span className="text-sm">Enhancement failed, showing original prompt...</span>
                <WordRevealContainer
                    words={displayWords}
                    isActive={status === 'revealing'}
                    showCursor={status === 'revealing'}
                    className="mt-1"
                />
            </div>
        );
    }

    // Show loading state during streaming
    if (status === 'streaming') {
        if (streamingText) {
            // Show the streaming text as it accumulates
            return (
                <div className={className}>
                    <span className="text-sm italic">
                        {streamingText}
                        <span className="animate-pulse">|</span>
                    </span>
                </div>
            );
        } else {
            // Show loading message when no text yet
            return (
                <div className={`text-muted-foreground ${className}`}>
                    <span className="text-sm animate-pulse">
                        {finalText ? 'Processing enhanced prompt...' : 'Enhancing prompt...'}
                    </span>
                </div>
            );
        }
    }

    // Main display
    return (
        <div className={className} {...getAccessibilityAttributes(status === 'revealing')}>
            {/* Keyboard instructions for screen readers */}
            {globalConfig.accessibility.enableScreenReaderAnnouncements && (
                <div className="sr-only" aria-live="polite">
                    {getKeyboardInstructions()}
                </div>
            )}

            <WordRevealContainer
                words={displayWords}
                isActive={status === 'revealing'}
                showCursor={enableTypingCursor && status === 'revealing'}
                enableAnimations={enableFadeInAnimations}
                accessibilitySettings={globalConfig.accessibility}
            />
        </div>
    );
}

export default StreamingPromptDisplay;