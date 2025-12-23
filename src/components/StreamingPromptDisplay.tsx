import { useEffect, useRef, useState, useCallback } from 'react';
import { StreamingPromptEnhancementService } from '../services/StreamingPromptEnhancementService';
import { useStreamingDisplayConfig, useFeatureFlag } from '../contexts';
import { useStreamingDisplayAccessibility } from '../hooks';
import { usePerformanceMonitoring } from '../services/PerformanceMonitoringService';
import type {
    PromptEnhancement,
    StreamingToken
} from '../types';

interface StreamingPromptDisplayProps {
    originalPrompt: string;
    enhancementType: PromptEnhancement;
    onEnhancementComplete?: (enhancedPrompt: string) => void;
    className?: string;
}

/**
 * Streaming prompt enhancement component using Canvas API
 * Handles streaming enhancement of prompts with real-time display
 */
export function StreamingPromptDisplay({
    originalPrompt,
    enhancementType,
    onEnhancementComplete,
    className = ''
}: StreamingPromptDisplayProps) {
    // Configuration from context
    const { config: globalConfig } = useStreamingDisplayConfig();
    const enableStreamingEnhancement = useFeatureFlag('enableStreamingEnhancement');

    // Performance monitoring
    const performanceMonitoring = usePerformanceMonitoring();

    // Accessibility features
    const {
        announce,
        announceStreamingStatus
    } = useStreamingDisplayAccessibility();

    // State management for streaming
    const [status, setStatus] = useState<'idle' | 'streaming' | 'complete' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [streamingText, setStreamingText] = useState<string>('');
    const [finalText, setFinalText] = useState<string>('');

    // Performance tracking
    const enhancementStartTimeRef = useRef<number>(0);

    // Service references
    const streamingServiceRef = useRef<StreamingPromptEnhancementService | null>(null);
    const isMountedRef = useRef(true);
    const isProcessingRef = useRef(false);

    // Initialize services
    useEffect(() => {
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
            isProcessingRef.current = false;
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamingServiceRef.current) {
                streamingServiceRef.current.cancelStreaming();
            }
        };
    }, []);

    // Handle enhancement completion
    const handleEnhancementComplete = useCallback((enhancedText: string) => {
        if (!isMountedRef.current) return;

        // Record enhancement performance
        if (enhancementStartTimeRef.current > 0) {
            performanceMonitoring.recordEnhancementTime(enhancementStartTimeRef.current, performance.now());
        }

        // Enhancement complete
        setFinalText(enhancedText);
        setStreamingText('');
        setStatus('complete');

        // Announce completion
        announceStreamingStatus('complete');

        // Call enhancement completion callback
        onEnhancementComplete?.(enhancedText);

        // Reset processing flag
        isProcessingRef.current = false;
    }, [onEnhancementComplete, announceStreamingStatus, performanceMonitoring]);

    // Handle streaming tokens
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

    // Handle streaming errors
    const handleStreamingError = useCallback((errorMessage: string) => {
        if (!isMountedRef.current) return;

        console.warn('Streaming enhancement error, falling back to original prompt:', errorMessage);
        setError(errorMessage);

        // Announce error and fallback
        announceStreamingStatus('error', errorMessage);

        // Use original prompt as fallback
        setFinalText(originalPrompt);
        setStatus('complete');
        onEnhancementComplete?.(originalPrompt);

        // Reset processing flag
        isProcessingRef.current = false;
    }, [originalPrompt, announceStreamingStatus, onEnhancementComplete]);

    // Start the enhancement process
    useEffect(() => {
        if (!originalPrompt || status !== 'idle' || isProcessingRef.current) return;

        const startProcess = async () => {
            // Prevent duplicate processing
            isProcessingRef.current = true;

            // Starting streaming prompt enhancement
            enhancementStartTimeRef.current = performance.now();
            setStatus('streaming');
            setError(null);
            setStreamingText('');

            // Announce start of process
            announceStreamingStatus('starting');

            // Check if enhancement should be skipped
            if (enhancementType === 'off' || !enableStreamingEnhancement || !streamingServiceRef.current) {
                // Skip enhancement, use original prompt
                setFinalText(originalPrompt);
                setStatus('complete');
                announceStreamingStatus('complete');
                onEnhancementComplete?.(originalPrompt);
                isProcessingRef.current = false;
                return;
            }

            try {
                // Start streaming enhancement
                await streamingServiceRef.current.enhancePromptStreaming(
                    originalPrompt,
                    enhancementType,
                    handleStreamingToken,
                    handleEnhancementComplete,
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
    }, [originalPrompt, enhancementType, status, enableStreamingEnhancement, handleStreamingToken, handleEnhancementComplete, handleStreamingError, onEnhancementComplete, announceStreamingStatus]);

    // Cancel active processes when props change
    useEffect(() => {
        return () => {
            if (streamingServiceRef.current) {
                streamingServiceRef.current.cancelStreaming();
            }
        };
    }, [originalPrompt, enhancementType]);

    // Show error state
    if (error && status !== 'complete') {
        return (
            <div className={`text-muted-foreground ${className}`}>
                <span className="text-sm">Enhancement failed, using original prompt</span>
            </div>
        );
    }

    // Show streaming state
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
                        Enhancing prompt...
                    </span>
                </div>
            );
        }
    }

    // Show completed state
    if (status === 'complete' && finalText) {
        return (
            <div className={className}>
                <span className="text-sm">{finalText}</span>
            </div>
        );
    }

    // Default idle state
    return (
        <div className={`text-muted-foreground ${className}`}>
            <span className="text-sm">Ready to enhance prompt...</span>
        </div>
    );
}

export default StreamingPromptDisplay;