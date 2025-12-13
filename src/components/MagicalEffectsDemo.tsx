import { MagicalImagePlaceholder } from './MagicalImagePlaceholder';
import { BasicMagicalEffect } from './BasicMagicalEffect';
import { TestAnimation } from './TestAnimation';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Demo component to showcase different magical loading effects
 */
export function MagicalEffectsDemo() {
    const navigate = useNavigate();
    return (
        <div className="p-8 space-y-8 bg-background min-h-screen">
            <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to App
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Magical Loading Effects</h1>
                        <p className="text-muted-foreground">
                            Different variants of magical color mixing for image generation
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Basic Effect */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-center">Basic Effect</h2>
                    <div className="aspect-square rounded-lg overflow-hidden">
                        <BasicMagicalEffect className="w-full h-full" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        Simple effect using only built-in Tailwind animations
                    </p>
                </div>

                {/* Simple Effect */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-center">Simple Effect</h2>
                    <div className="aspect-square rounded-lg overflow-hidden">
                        <MagicalImagePlaceholder
                            variant="simple"
                            className="w-full h-full"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        Lightweight CSS-only effect with animated orbs and energy flows
                    </p>
                </div>

                {/* Complex Effect */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-center">Complex Effect</h2>
                    <div className="aspect-square rounded-lg overflow-hidden">
                        <MagicalImagePlaceholder
                            variant="complex"
                            className="w-full h-full"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        Advanced CSS with blend modes and multiple animated layers
                    </p>
                </div>

                {/* Shader Effect */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-center">Shader Effect</h2>
                    <div className="aspect-square rounded-lg overflow-hidden">
                        <MagicalImagePlaceholder
                            variant="shader"
                            className="w-full h-full"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        WebGL shader-based fluid color mixing (fallback to complex if unsupported)
                    </p>
                </div>
            </div>

            {/* Different aspect ratios */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-center">Different Aspect Ratios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Wide format */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-center">Wide Format (16:9)</h3>
                        <div className="aspect-video rounded-lg overflow-hidden">
                            <MagicalImagePlaceholder
                                variant="basic"
                                className="w-full h-full"
                            />
                        </div>
                    </div>

                    {/* Portrait format */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-center">Portrait Format (9:16)</h3>
                        <div className="w-full max-w-xs mx-auto rounded-lg overflow-hidden" style={{ aspectRatio: '9/16' }}>
                            <MagicalImagePlaceholder
                                variant="basic"
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance comparison */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-center">Multiple Simultaneous Effects</h2>
                <p className="text-center text-muted-foreground">
                    Simulating multiple images generating at once
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden">
                            <MagicalImagePlaceholder
                                variant="basic"
                                className="w-full h-full"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Animation Test Section */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-center">Animation Test</h2>
                <TestAnimation />
            </div>
        </div>
    );
}