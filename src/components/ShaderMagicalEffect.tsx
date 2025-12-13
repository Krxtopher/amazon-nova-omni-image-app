import { useEffect, useRef } from 'react';

interface ShaderMagicalEffectProps {
    className?: string;
}

/**
 * A WebGL shader-based magical effect for image generation loading
 * Creates fluid, organic color mixing patterns
 */
export function ShaderMagicalEffect({ className = "" }: ShaderMagicalEffectProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

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
                
                float time = u_time * 0.5;
                
                // Create swirling patterns
                vec2 q = vec2(
                    fbm(p + vec2(0.0, time * 0.1)),
                    fbm(p + vec2(5.2, time * 0.15))
                );
                
                vec2 r = vec2(
                    fbm(p + 4.0 * q + vec2(1.7, time * 0.2)),
                    fbm(p + 4.0 * q + vec2(8.3, time * 0.25))
                );
                
                float f = fbm(p + 4.0 * r);
                
                // Create magical color palette
                vec3 color1 = vec3(0.6, 0.2, 0.9); // Purple
                vec3 color2 = vec3(0.2, 0.7, 0.9); // Cyan
                vec3 color3 = vec3(0.9, 0.3, 0.6); // Pink
                vec3 color4 = vec3(0.9, 0.7, 0.2); // Gold
                
                // Mix colors based on noise patterns
                vec3 color = mix(color1, color2, smoothstep(0.0, 0.5, f));
                color = mix(color, color3, smoothstep(0.3, 0.8, length(q)));
                color = mix(color, color4, smoothstep(0.5, 1.0, length(r)));
                
                // Add some sparkle
                float sparkle = smoothstep(0.8, 1.0, fbm(p * 8.0 + time));
                color += sparkle * 0.3;
                
                // Fade edges for a magical vignette
                float vignette = 1.0 - length(p * 0.5);
                vignette = smoothstep(0.3, 1.0, vignette);
                
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
        const positionLocation = gl.getAttribLocation(program, 'a_position');

        // Resize canvas to match display size
        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Animation loop
        function animate(time: number) {
            gl.useProgram(program);

            // Set uniforms
            gl.uniform1f(timeLocation, time * 0.001);
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

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
    }, []);

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