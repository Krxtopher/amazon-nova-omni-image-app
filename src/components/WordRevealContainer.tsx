import { useState, useEffect, useRef, memo } from 'react';

interface WordRevealContainerProps {
    words: string[];
    delayPerCharacterMsec?: number;
}

const WordRevealContainer = memo(function WordRevealContainer({ words, delayPerCharacterMsec = 50 }: WordRevealContainerProps) {
    const [visibleWordCount, setVisibleWordCount] = useState(0);
    const wordsRef = useRef<string[]>([]);
    const isAnimatingRef = useRef(false);

    useEffect(() => {
        if (words.length === 0) return;

        wordsRef.current = words;
        isAnimatingRef.current = true;
        setVisibleWordCount(0);

        let timeoutId: NodeJS.Timeout;

        const revealNextWord = (currentIndex: number) => {
            if (currentIndex >= words.length) {
                isAnimatingRef.current = false;
                return;
            }

            setVisibleWordCount(currentIndex + 1);

            if (currentIndex + 1 < words.length) {
                // Calculate delay based on current word's character count
                const currentWord = words[currentIndex + 1];
                let delay = currentWord.length * delayPerCharacterMsec;

                // Add extra delay for punctuation
                delay += /[.!?]/.test(currentWord) ? delayPerCharacterMsec * 12 : 0;
                delay += /[,;:]/.test(currentWord) ? delayPerCharacterMsec * 6 : 0;

                timeoutId = setTimeout(() => {
                    revealNextWord(currentIndex + 1);
                }, delay);
            } else {
                isAnimatingRef.current = false;
            }
        };

        // Start revealing words
        revealNextWord(0);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [words, delayPerCharacterMsec]);

    return (
        <div style={{ whiteSpace: 'pre-wrap' }}>
            {words.slice(0, visibleWordCount).map((word, wordIndex) => (
                <span
                    key={`${wordIndex}-${word}`}
                    className="opacity-0 animate-fade-in"
                    style={{
                        animation: 'fadeIn 0.6s ease-in-out forwards',
                        display: 'inline',
                        animationDelay: `${wordIndex * 50}ms`
                    }}
                >
                    {word}{wordIndex < words.length - 1 ? ' ' : ''}
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