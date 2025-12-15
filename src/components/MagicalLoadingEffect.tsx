import { useEffect, useState } from 'react';

interface MagicalLoadingEffectProps {
    className?: string;
}

/**
 * A magical color mixing effect for image generation loading states
 * Uses CSS animations and blend modes to create swirling, mixing colors
 */
export function MagicalLoadingEffect({ className = "" }: MagicalLoadingEffectProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Base magical void background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-pink-900/35" />

            {/* Animated color layers with different blend modes */}
            <div className="absolute inset-0">
                {/* Layer 1: Swirling purple */}
                <div
                    className="absolute inset-0 opacity-80 mix-blend-screen transition-transform duration-1000"
                    style={{
                        background: 'radial-gradient(circle at 30% 70%, rgba(147, 51, 234, 0.8) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(79, 70, 229, 0.6) 0%, transparent 50%)',
                        animation: mounted ? 'spin 8s linear infinite' : 'none'
                    }}
                />

                {/* Layer 2: Flowing cyan */}
                <div
                    className="absolute inset-0 opacity-70 mix-blend-color-dodge transition-transform duration-1000"
                    style={{
                        background: 'radial-gradient(ellipse at 20% 50%, rgba(6, 182, 212, 0.7) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(34, 197, 94, 0.5) 0%, transparent 60%)',
                        animation: mounted ? 'pulse 6s ease-in-out infinite' : 'none'
                    }}
                />

                {/* Layer 3: Magical pink */}
                <div
                    className="absolute inset-0 opacity-60 mix-blend-overlay transition-transform duration-1000"
                    style={{
                        background: 'radial-gradient(circle at 60% 40%, rgba(236, 72, 153, 0.6) 0%, transparent 70%), radial-gradient(circle at 40% 60%, rgba(168, 85, 247, 0.5) 0%, transparent 70%)',
                        animation: mounted ? 'bounce 10s ease-in-out infinite' : 'none'
                    }}
                />

                {/* Layer 4: Golden sparkles */}
                <div
                    className="absolute inset-0 opacity-50 mix-blend-soft-light transition-transform duration-1000"
                    style={{
                        background: 'radial-gradient(circle at 50% 20%, rgba(251, 191, 36, 0.5) 0%, transparent 40%), radial-gradient(circle at 50% 80%, rgba(245, 158, 11, 0.4) 0%, transparent 40%)',
                        animation: mounted ? 'spin 12s linear infinite reverse' : 'none'
                    }}
                />
            </div>

            {/* Subtle shimmer overlay */}
            <div className="absolute inset-0 opacity-40">
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000"
                    style={{
                        animation: mounted ? 'pulse 3s ease-in-out infinite' : 'none'
                    }}
                />
            </div>

            {/* Central magical core */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 opacity-80 transition-all duration-1000"
                    style={{
                        filter: 'blur(2px)',
                        animation: mounted ? 'pulse 2s ease-in-out infinite' : 'none'
                    }}
                />
            </div>

            {/* Subtle border */}
            <div className="absolute inset-0 border-2 border-dashed border-purple-300/40 rounded-lg" />
        </div>
    );
}