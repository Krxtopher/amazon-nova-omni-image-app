import { useState, useEffect } from 'react';

interface WordRevealContainerProps {
    words: string[];
    delayPerCharacterMsec?: number;
}

export default function WordRevealContainer({ words, delayPerCharacterMsec = 50 }: WordRevealContainerProps) {
    const [visibleWordCount, setVisibleWordCount] = useState(0);

    useEffect(() => {
        if (words.length === 0) return;

        let timeoutId: NodeJS.Timeout;

        const revealNextWord = (currentIndex: number) => {
            if (currentIndex >= words.length) return;

            setVisibleWordCount(currentIndex + 1);

            if (currentIndex + 1 < words.length) {
                // Calculate delay based on current word's character count
                const currentWord = words[currentIndex];
                let delay = currentWord.length * delayPerCharacterMsec;

                // Add extra delay for punctuation
                delay += /[.!?]/.test(currentWord) ? delayPerCharacterMsec * 12 : 0;
                delay += /[,;:]/.test(currentWord) ? delayPerCharacterMsec * 6 : 0;

                timeoutId = setTimeout(() => {
                    revealNextWord(currentIndex + 1);
                }, delay);
            }
        };

        // Start revealing words
        revealNextWord(0);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [words]);

    return (
        <div style={{ whiteSpace: 'pre' }}>
            {words.slice(0, visibleWordCount).map((word, wordIndex) => (
                <span
                    key={`${wordIndex}-${word}`}
                    className="opacity-0 animate-fade-in"
                    style={{
                        animation: 'fadeIn 0.6s ease-in-out forwards',
                        display: 'inline'
                    }}
                >
                    {word}
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
}