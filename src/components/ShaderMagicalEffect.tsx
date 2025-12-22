import { useEffect, useRef } from 'react';

interface ShaderMagicalEffectProps {
    className?: string;
    /** Animation speed multiplier (default: 1.0) */
    speed?: number;
    /** Color mixing intensity (default: 1.0) */
    colorIntensity?: number;
    /** Sparkle intensity (default: 1.0) */
    sparkleIntensity?: number;
}

/**
 * A WebGL shader-based magical effect for image generation loading
 * Creates fluid, organic color mixing patterns
 */
export function ShaderMagicalEffect({
    className = "",
    speed = 1.0,
    colorIntensity = 1.0,
    sparkleIntensity = 1.0
}: ShaderMagicalEffectProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const timeOffsetRef = useRef<number>(Math.random() * 1000); // Random time offset for uniqueness

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
        if (!gl) {
            return;
        }



        // Vertex shader
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Fragment shader with magical color mixing
        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 v_uv;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_speed;
            uniform float u_colorIntensity;
            uniform float u_sparkleIntensity;
            uniform float u_timeOffset;
            
            // Noise function for organic patterns
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = noise(i);
                float b = noise(i + vec2(1.0, 0.0));
                float c = noise(i + vec2(0.0, 1.0));
                float d = noise(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 4; i++) {
                    value += amplitude * smoothNoise(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                
                return value;
            }
            
            void main() {
                vec2 uv = v_uv;
                vec2 p = uv * 2.0 - 1.0;
                p.x *= u_resolution.x / u_resolution.y;
                
                float time = (u_time + u_timeOffset) * 0.5 * u_speed; // Configurable animation speed with unique offset
                
                // Create swirling patterns without directional motion
                // Use rotating/circular motion instead of linear time progression
                float angle1 = time * 0.3;
                float angle2 = time * 0.4;
                float angle3 = time * 0.5;
                
                vec2 q = vec2(
                    fbm(p * 0.5 + vec2(cos(angle1), sin(angle1)) * 0.3),
                    fbm(p * 0.5 + vec2(cos(angle2), sin(angle2)) * 0.4 + vec2(2.6, 0.0))
                );
                
                vec2 r = vec2(
                    fbm(p * 0.6 + 2.0 * q + vec2(cos(angle3), sin(angle3)) * 0.2 + vec2(0.8, 0.0)),
                    fbm(p * 0.6 + 2.0 * q + vec2(cos(angle1 * 1.3), sin(angle1 * 1.3)) * 0.25 + vec2(4.1, 0.0))
                );
                
                // Multiple noise layers for more active color mixing
                float f1 = fbm(p * 0.7 + 2.0 * r);
                float f2 = fbm(p * 0.8 + 1.0 * q + time * 0.3);
                float f3 = fbm(p * 0.5 + 1.5 * r + time * 0.4);
                
                // Create magical color palette with configurable intensity
                vec3 color1 = vec3(0.7, 0.1, 1.0) * u_colorIntensity; // Bright Purple
                vec3 color2 = vec3(0.1, 0.8, 1.0) * u_colorIntensity; // Bright Cyan
                vec3 color3 = vec3(1.0, 0.2, 0.7) * u_colorIntensity; // Hot Pink
                vec3 color4 = vec3(0.4, 0.1, 0.8) * u_colorIntensity; // Deep Purple
                
                // More active color mixing with multiple blend layers
                vec3 color = mix(color1, color2, smoothstep(0.0, 0.6, f1));
                color = mix(color, color3, smoothstep(0.2, 0.9, f2));
                color = mix(color, color4, smoothstep(0.4, 1.0, length(q) * 1.2));
                
                // Enhanced sparkle with configurable intensity
                float sparkle1 = smoothstep(0.85, 1.0, fbm(p * 15.0 + time * 1.2));
                float sparkle2 = smoothstep(0.9, 1.0, fbm(p * 10.0 + time * 0.8));
                color += (sparkle1 * 0.2 + sparkle2 * 0.1) * u_sparkleIntensity;
                
                gl_FragColor = vec4(color, 0.8);
            }
        `;

        // Compile shader
        function createShader(gl: WebGLRenderingContext, type: number, source: string) {
            const shader = gl.createShader(type);
            if (!shader) return null;

            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) return;

        // Create program
        const program = gl.createProgram();
        if (!program) return;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return;
        }

        // Set up geometry (full screen quad)
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Get uniform locations
        const timeLocation = gl.getUniformLocation(program, 'u_time');
        const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        const speedLocation = gl.getUniformLocation(program, 'u_speed');
        const colorIntensityLocation = gl.getUniformLocation(program, 'u_colorIntensity');
        const sparkleIntensityLocation = gl.getUniformLocation(program, 'u_sparkleIntensity');
        const timeOffsetLocation = gl.getUniformLocation(program, 'u_timeOffset');
        const positionLocation = gl.getAttribLocation(program, 'a_position');

        // Resize canvas to match display size
        function resizeCanvas() {
            if (!canvas || !gl) return;
            const rect = canvas.getBoundingClientRect();

            // Ensure we have valid dimensions
            if (rect.width === 0 || rect.height === 0) {
                // Fallback to parent container size if canvas rect is invalid
                const parent = canvas.parentElement;
                if (parent) {
                    const parentRect = parent.getBoundingClientRect();
                    canvas.width = parentRect.width * window.devicePixelRatio;
                    canvas.height = parentRect.height * window.devicePixelRatio;

                } else {
                    // Final fallback
                    canvas.width = 300 * window.devicePixelRatio;
                    canvas.height = 300 * window.devicePixelRatio;

                }
            } else {
                canvas.width = rect.width * window.devicePixelRatio;
                canvas.height = rect.height * window.devicePixelRatio;

            }

            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        // Initial resize
        resizeCanvas();

        // Delayed resize to handle masonry layout timing
        const delayedResize = setTimeout(() => {
            resizeCanvas();
        }, 100);

        // Listen for window resize
        window.addEventListener('resize', resizeCanvas);

        // Use ResizeObserver to detect when the canvas container changes size
        let resizeObserver: ResizeObserver | null = null;
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                // Use requestAnimationFrame to avoid excessive calls
                requestAnimationFrame(resizeCanvas);
            });
            resizeObserver.observe(canvas);
        }

        // Also observe parent container changes (for masonry grid)
        let parentObserver: ResizeObserver | null = null;
        if (window.ResizeObserver && canvas.parentElement) {
            parentObserver = new ResizeObserver(() => {
                requestAnimationFrame(resizeCanvas);
            });
            parentObserver.observe(canvas.parentElement);
        }

        // Animation loop
        function animate(time: number) {
            if (!gl || !canvas) return;

            gl.useProgram(program);

            // Set uniforms
            gl.uniform1f(timeLocation, time * 0.001);
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            gl.uniform1f(speedLocation, speed);
            gl.uniform1f(colorIntensityLocation, colorIntensity);
            gl.uniform1f(sparkleIntensityLocation, sparkleIntensity);
            gl.uniform1f(timeOffsetLocation, timeOffsetRef.current);

            // Set up attributes
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            // Clear and draw
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            animationRef.current = requestAnimationFrame(animate);
        }

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            clearTimeout(delayedResize);
            window.removeEventListener('resize', resizeCanvas);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (parentObserver) {
                parentObserver.disconnect();
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [speed, colorIntensity, sparkleIntensity]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full ${className}`}
            style={{
                mixBlendMode: 'normal',
                opacity: 0.9,
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
            }}
        />
    );
}