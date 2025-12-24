import { useState, useEffect, useRef, memo } from 'react';

interface WordRevealContainerProps {
    words: string[];
    delayPerCharacterMsec?: number;
}

const WordRevealContainer = memo(function WordRevealContainer({ words, delayPerCharacterMsec = 50 }: WordRevealContainerProps) {
    const [domWords, setDomWords] = useState<string[]>([]);
    const wordsRef = useRef<string[]>([]);
    const isAnimatingRef = useRef(false);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    useEffect(() => {
        if (words.length === 0) return;

        wordsRef.current = words;
        isAnimatingRef.current = true;
        setDomWords([]);

        // Clear any existing timeouts
        timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        timeoutsRef.current = [];

        let cumulativeDelay = 0;

        words.forEach((word, index) => {
            const timeoutId = setTimeout(() => {
                setDomWords(prev => [...prev, word]);

                if (index === words.length - 1) {
                    isAnimatingRef.current = false;
                }
            }, cumulativeDelay);

            timeoutsRef.current.push(timeoutId);

            // Calculate delay for next word based on current word's character count.
            // Use an exponential curve to make short words appear faster and long words slower.
            let delay = expRiseMapped(word.length, 5, 0, 10, delayPerCharacterMsec, delayPerCharacterMsec * 10)

            // Add extra delay for punctuation
            delay += /[.!?]/.test(word) ? delayPerCharacterMsec * 6 : 0;
            delay += /[,;:]/.test(word) ? delayPerCharacterMsec * 4 : 0;

            cumulativeDelay += delay;
        });

        return () => {
            timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            timeoutsRef.current = [];
        };
    }, [words, delayPerCharacterMsec]);

    return (
        <div style={{ whiteSpace: 'pre-wrap' }}>
            {domWords.map((word, wordIndex) => (
                <span
                    key={`${wordIndex}-${word}`}
                    className="opacity-0 animate-fade-in"
                    style={{
                        animation: 'fadeIn 0.6s ease-in-out forwards',
                        display: 'inline'
                    }}
                >
                    {word}{wordIndex < domWords.length - 1 ? ' ' : ''}
                </span>
            ))}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `
            }} />
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if words array actually changed
    return (
        JSON.stringify(prevProps.words) === JSON.stringify(nextProps.words) &&
        prevProps.delayPerCharacterMsec === nextProps.delayPerCharacterMsec
    );
});

/**
 * Exponential rise curve mapped to an arbitrary range,
 * with ergonomic defaults.
 *
 * Defaults:
 * - k = 4
 * - input range = [0, 1]
 * - output range = [0, 1]
 */
export function expRiseMapped(
    x: number,
    k: number = 4,
    inMin: number = 0,
    inMax: number = 1,
    outMin: number = 0,
    outMax: number = 1
): number {
    if (k <= 0) {
        throw new Error("k must be > 0");
    }
    if (inMax === inMin) {
        throw new Error("inMax must not equal inMin");
    }

    // Normalize input to [0, 1]
    const t = (x - inMin) / (inMax - inMin);

    // Clamp to [0, 1]
    const clampedT = Math.min(Math.max(t, 0), 1);

    // Exponential rise in [0, 1]
    const y01 = 1 - Math.exp(-k * clampedT);

    // Map to output range
    return outMin + (outMax - outMin) * y01;
}

export default WordRevealContainer;