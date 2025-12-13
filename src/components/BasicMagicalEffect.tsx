interface BasicMagicalEffectProps {
    className?: string;
}

/**
 * Very basic magical effect using only simple CSS
 * No custom animations, just built-in Tailwind
 */
export function BasicMagicalEffect({ className = "" }: BasicMagicalEffectProps) {
    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Base background */}
            <div className="absolute inset-0 bg-purple-900/30" />

            {/* Simple animated elements using built-in Tailwind animations */}
            <div className="absolute inset-0">
                {/* Spinning element */}
                <div
                    className="absolute w-12 h-12 rounded-full bg-purple-500/60 animate-spin"
                    style={{
                        top: '30%',
                        left: '20%',
                        animationDuration: '3s'
                    }}
                />

                {/* Pulsing element */}
                <div
                    className="absolute w-8 h-8 rounded-full bg-pink-500/60 animate-pulse"
                    style={{
                        top: '60%',
                        right: '25%',
                        animationDuration: '2s'
                    }}
                />

                {/* Bouncing element */}
                <div
                    className="absolute w-6 h-6 rounded-full bg-cyan-500/60 animate-bounce"
                    style={{
                        bottom: '30%',
                        left: '40%',
                        animationDuration: '1.5s'
                    }}
                />
            </div>

            {/* Border */}
            <div className="absolute inset-0 border-2 border-dashed border-purple-300/40 rounded-lg" />

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-1">
                    <div className="w-4 h-4 mx-auto rounded-full bg-purple-400 animate-pulse" />
                    <p className="text-xs text-white/80 font-medium">
                        Creating...
                    </p>
                </div>
            </div>
        </div>
    );
}