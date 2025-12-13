/**
 * Simple test component to verify CSS animations are working
 */
export function TestAnimation() {
    return (
        <div className="p-8 space-y-4">
            <h2 className="text-xl font-bold">Animation Test</h2>

            {/* Test built-in Tailwind animations */}
            <div className="space-y-4">
                <div className="w-16 h-16 bg-red-500 animate-spin"></div>
                <div className="w-16 h-16 bg-blue-500 animate-pulse"></div>
                <div className="w-16 h-16 bg-green-500 animate-bounce"></div>
            </div>

            {/* Test our custom animations */}
            <div className="space-y-4">
                <div className="w-16 h-16 bg-purple-500 animate-spin-slow"></div>
                <div className="w-16 h-16 bg-pink-500 animate-pulse-slow"></div>
                <div className="w-16 h-16 bg-cyan-500 animate-pulse-glow"></div>
            </div>

            {/* Test inline styles */}
            <div
                className="w-16 h-16 bg-yellow-500"
                style={{
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.3) 50%, transparent 70%)',
                    animation: 'pulse 2s ease-in-out infinite'
                }}
            ></div>
        </div>
    );
}