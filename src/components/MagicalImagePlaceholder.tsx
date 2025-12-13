import { useState, useEffect } from 'react';
import { MagicalLoadingEffect } from './MagicalLoadingEffect';
import { ShaderMagicalEffect } from './ShaderMagicalEffect';
import { SimpleMagicalEffect } from './SimpleMagicalEffect';
import { BasicMagicalEffect } from './BasicMagicalEffect';

interface MagicalImagePlaceholderProps {
    className?: string;
    variant?: 'basic' | 'simple' | 'complex' | 'shader';
}

/**
 * A magical placeholder for image generation with animated color mixing
 * Supports both WebGL shader effects and CSS fallback
 */
export function MagicalImagePlaceholder({
    className = "",
    variant = 'basic'
}: MagicalImagePlaceholderProps) {
    const [webglSupported, setWebglSupported] = useState(false);

    useEffect(() => {
        if (variant === 'shader') {
            // Check WebGL support only when needed
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            setWebglSupported(!!gl);
        }
    }, [variant]);

    // Choose effect based on variant
    const renderEffect = () => {
        switch (variant) {
            case 'shader':
                return webglSupported ? (
                    <ShaderMagicalEffect
                        className="absolute inset-0"
                        speed={1.2}
                        colorIntensity={1.3}
                        sparkleIntensity={1.5}
                    />
                ) : (
                    <MagicalLoadingEffect className="absolute inset-0" />
                );
            case 'complex':
                return <MagicalLoadingEffect className="absolute inset-0" />;
            case 'simple':
                return <SimpleMagicalEffect className="absolute inset-0" />;
            case 'basic':
            default:
                return <BasicMagicalEffect className="absolute inset-0" />;
        }
    };

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {renderEffect()}
        </div>
    );
}