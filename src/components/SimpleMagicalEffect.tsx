interface SimpleMagicalEffectProps {
    className?: string;
}

/**
 * A lightweight magical effect using only CSS
 * Perfect for multiple simultaneous loading states
 */
export function SimpleMagicalEffect({ className = "" }: SimpleMagicalEffectProps) {

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Base magical void */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-pink-900/25" />

            {/* Animated orbs */}
            <div className="absolute inset-0">
                {/* Primary magical orb */}
                <div
                    className="absolute w-20 h-20 rounded-full opacity-70"
                    style={{
                        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.8) 0%, rgba(147, 51, 234, 0.4) 40%, transparent 70%)',
                        top: '25%',
                        left: '15%',
                        filter: 'blur(1px)',
                        animation: 'pulse 3s ease-in-out infinite',
                        animationDelay: '0s'
                    }}
                />

                {/* Secondary orb */}
                <div
                    className="absolute w-16 h-16 rounded-full opacity-60"
                    style={{
                        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.7) 0%, rgba(6, 182, 212, 0.3) 40%, transparent 70%)',
                        top: '55%',
                        right: '20%',
                        filter: 'blur(1px)',
                        animation: 'pulse 2.5s ease-in-out infinite',
                        animationDelay: '1s'
                    }}
                />

                {/* Tertiary orb */}
                <div
                    className="absolute w-12 h-12 rounded-full opacity-65"
                    style={{
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, rgba(236, 72, 153, 0.3) 40%, transparent 70%)',
                        top: '15%',
                        right: '25%',
                        filter: 'blur(0.5px)',
                        animation: 'pulse 2s ease-in-out infinite',
                        animationDelay: '2s'
                    }}
                />

                {/* Golden sparkle */}
                <div
                    className="absolute w-8 h-8 rounded-full opacity-80"
                    style={{
                        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.9) 0%, rgba(251, 191, 36, 0.4) 50%, transparent 70%)',
                        bottom: '25%',
                        left: '35%',
                        animation: 'pulse 1.5s ease-in-out infinite',
                        animationDelay: '0.5s'
                    }}
                />
            </div>

            {/* Flowing energy lines */}
            <div className="absolute inset-0 opacity-40">
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(147, 51, 234, 0.5), transparent, rgba(6, 182, 212, 0.4), transparent)',
                        borderRadius: '50%',
                        animation: 'spin 15s linear infinite'
                    }}
                />
            </div>

            {/* Subtle border */}
            <div className="absolute inset-0 border-2 border-dashed border-purple-300/30 rounded-lg" />

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-1">
                    <div
                        className="w-5 h-5 mx-auto rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-80"
                        style={{
                            animation: 'pulse 2s ease-in-out infinite'
                        }}
                    />
                    <p className="text-xs text-muted-foreground font-medium">
                        Creating...
                    </p>
                </div>
            </div>
        </div>
    );
}