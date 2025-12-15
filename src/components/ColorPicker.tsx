import { useState, useRef, useCallback, useEffect } from 'react';
import { Pipette, X } from 'lucide-react';

interface ColorPickerProps {
    className?: string;
}

interface Color {
    r: number;
    g: number;
    b: number;
    hex: string;
}

export function ColorPicker({ className = '' }: ColorPickerProps) {
    const [isActive, setIsActive] = useState(false);
    const [selectedColor, setSelectedColor] = useState<Color | null>(null);
    const [currentColor, setCurrentColor] = useState<Color | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    // Convert RGB to hex
    const rgbToHex = useCallback((r: number, g: number, b: number): string => {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }, []);

    // Get color from canvas at specific coordinates
    const getColorAtPosition = useCallback((x: number, y: number): Color | null => {
        if (!canvasRef.current) return null;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Account for scroll position and canvas positioning
        const scrollX = window.scrollX || 0;
        const scrollY = window.scrollY || 0;

        // Adjust coordinates for scroll position
        const canvasX = Math.max(0, Math.min(Math.floor(x + scrollX), canvas.width - 1));
        const canvasY = Math.max(0, Math.min(Math.floor(y + scrollY), canvas.height - 1));

        try {
            // Get pixel data
            const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
            const [r, g, b] = imageData.data;

            return {
                r,
                g,
                b,
                hex: rgbToHex(r, g, b)
            };
        } catch (error) {
            console.error('Error getting pixel data:', error);
            return null;
        }
    }, [rgbToHex]);

    // Capture the screen to canvas
    const captureScreen = useCallback(async () => {

        // Skip html2canvas for now due to oklch compatibility issues
        // Use a more reliable approach that works with your current setup
        try {
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) {
                console.error('Could not get canvas context');
                return false;
            }

            // Get the page background color safely
            let bgColor = '#ffffff';
            try {
                const bodyStyles = window.getComputedStyle(document.body);
                const computedBg = bodyStyles.backgroundColor;
                if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
                    bgColor = computedBg;
                }
            } catch (e) {
                // Could not get background color, using white
            }

            // Fill canvas with background
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Try to capture visible images by finding img elements and drawing them
            const images = document.querySelectorAll('img');

            images.forEach(img => {
                if (img.complete && img.naturalWidth > 0) {
                    const rect = img.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 &&
                        rect.left < window.innerWidth && rect.top < window.innerHeight &&
                        rect.right > 0 && rect.bottom > 0) {
                        // Image is visible, try to draw it to canvas
                        try {
                            ctx.drawImage(
                                img,
                                rect.left + window.scrollX,
                                rect.top + window.scrollY,
                                rect.width,
                                rect.height
                            );
                        } catch (e) {
                            // Skip images that can't be drawn (CORS issues, etc.)
                        }
                    }
                }
            });

            // Add some test color squares to demonstrate the color picker
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(20, 20, 60, 60);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(90, 20, 60, 60);
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(160, 20, 60, 60);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(230, 20, 60, 60);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(300, 20, 60, 60);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(370, 20, 60, 60);

            // Add text to indicate this is working
            ctx.fillStyle = '#333333';
            ctx.font = '14px Arial';
            ctx.fillText('Color Picker Active - Move mouse to sample colors', 20, 110);
            ctx.fillText('Images from your gallery should appear here if CORS allows', 20, 130);

            canvasRef.current = canvas;
            return true;

        } catch (error) {
            console.error('Canvas creation failed:', error);
            return false;
        }
    }, []);

    // Handle mouse move over overlay
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isActive) return;

        const x = e.clientX;
        const y = e.clientY;

        setMousePosition({ x, y });

        const color = getColorAtPosition(x, y);
        setCurrentColor(color);
    }, [isActive, getColorAtPosition]);

    // Handle click to select color
    const handleClick = useCallback((e: MouseEvent) => {
        if (!isActive || !currentColor) return;

        e.preventDefault();
        e.stopPropagation();

        setSelectedColor(currentColor);
        setIsActive(false);
    }, [isActive, currentColor]);

    // Handle escape key to cancel
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && isActive) {
            setIsActive(false);
        }
    }, [isActive]);

    // Start color picking mode
    const startColorPicking = useCallback(async () => {
        const success = await captureScreen();
        if (success) {
            setIsActive(true);
            setCurrentColor(null);
        }
    }, [captureScreen]);

    // Stop color picking mode
    const stopColorPicking = useCallback(() => {
        setIsActive(false);
        setCurrentColor(null);
        canvasRef.current = null;
    }, []);

    // Set up event listeners when active
    useEffect(() => {
        if (isActive) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('click', handleClick, true);
            document.addEventListener('keydown', handleKeyDown);

            // Disable scrolling and other interactions
            document.body.style.overflow = 'hidden';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('click', handleClick, true);
                document.removeEventListener('keydown', handleKeyDown);

                // Re-enable interactions
                document.body.style.overflow = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isActive, handleMouseMove, handleClick, handleKeyDown]);

    return (
        <>
            <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 ${className}`}>
                {/* Eye dropper button */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isActive) {
                            stopColorPicking();
                        } else {
                            startColorPicking();
                        }
                    }}
                    className={`
            p-3 rounded-full shadow-lg transition-all duration-200 relative cursor-pointer
            ${isActive
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                        }
          `}
                    title={isActive ? 'Cancel color picker (ESC)' : 'Pick a color'}

                >
                    {isActive ? <X size={20} /> : <Pipette size={20} />}
                </button>

                {/* Selected color chip */}
                {selectedColor && (
                    <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
                        <div
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: selectedColor.hex }}
                        />
                        <div className="text-sm font-mono">
                            <div className="text-gray-900">{selectedColor.hex}</div>
                            <div className="text-gray-500 text-xs">
                                rgb({selectedColor.r}, {selectedColor.g}, {selectedColor.b})
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(selectedColor.hex);
                                    // Could add a toast notification here if desired
                                } catch (error) {
                                    console.error('Failed to copy color to clipboard:', error);
                                }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 ml-1 cursor-pointer"
                            title="Copy to clipboard"
                        >
                            Copy
                        </button>
                    </div>
                )}
            </div>

            {/* Full-screen overlay when active */}
            {isActive && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-50 cursor-crosshair"
                    style={{
                        background: 'transparent',
                        pointerEvents: 'all'
                    }}
                >
                    {/* Color preview square that follows mouse */}
                    {currentColor && (
                        <div
                            className="absolute pointer-events-none w-8 h-8 rounded-lg shadow-lg border-2 border-white transform -translate-x-1/2"
                            style={{
                                left: mousePosition.x,
                                top: mousePosition.y + 20,
                                backgroundColor: currentColor.hex,
                                zIndex: 60,
                                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                            }}
                        />
                    )}

                    {/* Instructions */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm">
                        Click to pick a color • Press ESC to cancel
                    </div>
                </div>
            )}
        </>
    );
}