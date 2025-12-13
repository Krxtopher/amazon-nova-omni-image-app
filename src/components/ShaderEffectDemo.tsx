import { useState } from 'react';
import { ShaderMagicalEffect } from './ShaderMagicalEffect';

/**
 * Demo component for testing shader effect parameters
 */
export function ShaderEffectDemo() {
    const [speed, setSpeed] = useState(1.2);
    const [colorIntensity, setColorIntensity] = useState(1.3);
    const [sparkleIntensity, setSparkleIntensity] = useState(1.5);

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-white">Shader Effect Demo</h2>

            {/* Controls */}
            <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
                <div>
                    <label className="block text-white text-sm font-medium mb-2">
                        Speed: {speed.toFixed(1)}
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-white text-sm font-medium mb-2">
                        Color Intensity: {colorIntensity.toFixed(1)}
                    </label>
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={colorIntensity}
                        onChange={(e) => setColorIntensity(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-white text-sm font-medium mb-2">
                        Sparkle Intensity: {sparkleIntensity.toFixed(1)}
                    </label>
                    <input
                        type="range"
                        min="0.0"
                        max="3.0"
                        step="0.1"
                        value={sparkleIntensity}
                        onChange={(e) => setSparkleIntensity(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>

                <button
                    onClick={() => {
                        setSpeed(1.2);
                        setColorIntensity(1.3);
                        setSparkleIntensity(1.5);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Reset to Defaults
                </button>
            </div>

            {/* Effect Preview */}
            <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
                <ShaderMagicalEffect
                    className="absolute inset-0"
                    speed={speed}
                    colorIntensity={colorIntensity}
                    sparkleIntensity={sparkleIntensity}
                />
            </div>

            {/* Current Values */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-2">Current Parameters:</h3>
                <pre className="text-green-400 text-sm">
                    {`<ShaderMagicalEffect
    speed={${speed}}
    colorIntensity={${colorIntensity}}
    sparkleIntensity={${sparkleIntensity}}
/>`}
                </pre>
            </div>
        </div>
    );
}