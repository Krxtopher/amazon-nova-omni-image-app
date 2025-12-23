import { useState } from 'react';
import WordRevealContainer from '../components/WordRevealContainer';

const samplePhrases = [
    ['Hello', ' ', 'world', ',', ' ', 'this', ' ', 'is', ' ', 'a', ' ', 'test', '!'],
    ['The', ' ', 'quick', ' ', 'brown', ' ', 'fox', ' ', 'jumps', ' ', 'over', ' ', 'the', ' ', 'lazy', ' ', 'dog', '.', ' ', 'Then', ',', ' ', 'a', ' ', 'slower', ' ', 'fox', ' ', 'took', ' ', 'a', ' ', 'nap', '.'],
    ['React', ' ', 'components', ' ', 'are', ' ', 'awesome', ' ', 'for', ' ', 'building', ' ', 'interactive', ' ', 'user', ' ', 'interfaces', '.'],
    ['Short', ' ', 'words', ' ', 'reveal', ' ', 'fast', ',', ' ', 'while', ' ', 'longer', ' ', 'words', ' ', 'create', ' ', 'dramatic', ' ', 'pauses', '.'],
    ['Welcome', ' ', 'to', ' ', 'the', ' ', 'WordRevealContainer', ' ', 'demonstration', ' ', 'page', '!']
];

export default function WordRevealDemo() {
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [key, setKey] = useState(0);

    const handleNextPhrase = () => {
        const nextIndex = (currentPhraseIndex + 1) % samplePhrases.length;
        setCurrentPhraseIndex(nextIndex);
        setKey(prev => prev + 1); // Force re-render to restart animation
    };

    const handleReset = () => {
        setKey(prev => prev + 1); // Force re-render to restart current phrase
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                    WordRevealContainer Demo
                </h1>

                <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">
                        Phrase {currentPhraseIndex + 1} of {samplePhrases.length}
                    </h2>

                    <div className="text-lg text-gray-800 leading-relaxed mb-6 min-h-8">
                        <WordRevealContainer
                            key={key}
                            words={samplePhrases[currentPhraseIndex]}
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Reset Current
                        </button>
                        <button
                            onClick={handleNextPhrase}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                            Next Phrase
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">How it works:</h3>
                    <ul className="text-gray-600 space-y-2">
                        <li>• Words are revealed sequentially, one at a time</li>
                        <li>• The delay between words is based on the character count of the previous word</li>
                        <li>• Longer words create longer pauses (50ms per character)</li>
                        <li>• Each word is wrapped in a span with a unique key</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}