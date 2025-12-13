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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
        if (!gl) {
            console.warn('WebGL not supported, falling back to CSS effect');
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
                
                float time = u_time * 0.8 * u_speed; // Configurable animation speed
                
                // Create swirling patterns without directional motion
                // Use rotating/circular motion instead of linear time progression
                float angle1 = time * 0.3;
                float angle2 = time * 0.4;
                float angle3 = time * 0.5;
                
                vec2 q = vec2(
                    fbm(p + vec2(cos(angle1), sin(angle1)) * 0.5),
                    fbm(p + vec2(cos(angle2), sin(angle2)) * 0.7 + vec2(5.2, 0.0))
                );
                
                vec2 r = vec2(
                    fbm(p + 4.0 * q + vec2(cos(angle3), sin(angle3)) * 0.3 + vec2(1.7, 0.0)),
                    fbm(p + 4.0 * q + vec2(cos(angle1 * 1.3), sin(angle1 * 1.3)) * 0.4 + vec2(8.3, 0.0))
                );
                
                // Multiple noise layers for more active color mixing
                float f1 = fbm(p + 4.0 * r);
                float f2 = fbm(p * 1.5 + 2.0 * q + time * 0.6);
                float f3 = fbm(p * 0.8 + 3.0 * r + time * 0.4);
                
                // Create magical color palette with configurable intensity
                vec3 color1 = vec3(0.7, 0.1, 1.0) * u_colorIntensity; // Bright Purple
                vec3 color2 = vec3(0.1, 0.8, 1.0) * u_colorIntensity; // Bright Cyan
                vec3 color3 = vec3(1.0, 0.2, 0.7) * u_colorIntensity; // Hot Pink
                vec3 color4 = vec3(1.0, 0.8, 0.1) * u_colorIntensity; // Bright Gold
                vec3 color5 = vec3(0.2, 1.0, 0.4) * u_colorIntensity; // Bright Green
                
                // More active color mixing with multiple blend layers
                vec3 color = mix(color1, color2, smoothstep(0.0, 0.6, f1));
                color = mix(color, color3, smoothstep(0.2, 0.9, f2));
                color = mix(color, color4, smoothstep(0.4, 1.0, length(q) * 1.2));
                color = mix(color, color5, smoothstep(0.3, 0.8, f3));
                
                // Enhanced sparkle with configurable intensity
                float sparkle1 = smoothstep(0.7, 1.0, fbm(p * 12.0 + time * 1.2));
                float sparkle2 = smoothstep(0.8, 1.0, fbm(p * 6.0 + time * 0.8));
                color += (sparkle1 * 0.4 + sparkle2 * 0.2) * u_sparkleIntensity;
                
                // Softer vignette to keep more of the active mixing visible
                float vignette = 1.0 - length(p * 0.4);
                vignette = smoothstep(0.2, 1.0, vignette);
                
                gl_FragColor = vec4(color * vignette, 0.8);
            }
        `;

        // Compile shader
        function createShader(gl: WebGLRenderingContext, type: number, source: string) {
            const shader = gl.createShader(type);
            if (!shader) return null;

            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
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
            console.error('Program link error:', gl.getProgramInfoLog(program));
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
        const positionLocation = gl.getAttribLocation(program, 'a_position');

        // Resize canvas to match display size
        function resizeCanvas() {
            if (!canvas || !gl) return;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

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
            window.removeEventListener('resize', resizeCanvas);
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
                mixBlendMode: 'screen',
                opacity: 0.7
            }}
        />
    );
}