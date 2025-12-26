import { expRiseMapped } from '@/utils/mathUtils';
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
            delay += /[.!?]/.test(word) ? delayPerCharacterMsec * 20 : 0;
            delay += /[,;:]/.test(word) ? delayPerCharacterMsec * 7 : 0;

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

export default WordRevealContainer;