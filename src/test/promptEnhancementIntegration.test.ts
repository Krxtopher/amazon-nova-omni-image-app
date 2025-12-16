import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BedrockImageService } from '../services/BedrockImageService';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
        send: vi.fn(),
        config: {
            region: vi.fn().mockResolvedValue('us-east-1')
        }
    })),
    ConverseCommand: vi.fn()
}));

describe('Persona Integration', () => {
    let bedrockService: BedrockImageService;
    let mockSend: any;

    beforeEach(() => {
        const mockClient = {
            send: vi.fn(),
            config: {
                region: vi.fn().mockResolvedValue('us-east-1')
            }
        };
        mockSend = mockClient.send;

        bedrockService = new BedrockImageService({
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test',
                secretAccessKey: 'test'
            }
        });

        // Replace the client with our mock
        (bedrockService as any).client = mockClient;
    });

    it('should enhance prompt and use it for image generation', async () => {
        const originalPrompt = 'A cat';
        const enhancedPrompt = 'A majestic cat with piercing eyes, dramatic lighting, professional photography';
        // const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

        // Mock the enhancement call
        mockSend
            .mockResolvedValueOnce({
                output: {
                    message: {
                        content: [{ text: enhancedPrompt }]
                    }
                }
            })
            // Mock the image generation call
            .mockResolvedValueOnce({
                output: {
                    message: {
                        content: [
                            {
                                image: {
                                    format: 'png',
                                    source: {
                                        bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 99, 100, 96, 248, 95, 15, 0, 8, 112, 1, 128, 235, 71, 186, 146, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
                                    }
                                }
                            }
                        ]
                    }
                },
                stopReason: 'end_turn'
            });

        // First, test persona enhancement
        const result = await bedrockService.enhancePrompt(originalPrompt, 'standard');
        expect(result).toBe(enhancedPrompt);

        // Then test image generation with enhanced prompt
        const generationResult = await bedrockService.generateContent({
            prompt: `${enhancedPrompt} (aspect ratio 1:1)`,
            aspectRatio: '1:1',
            promptEnhancement: 'standard'
        });

        expect(generationResult.type).toBe('image');
        if (generationResult.type === 'image') {
            expect(generationResult.imageDataUrl).toContain('data:image/png;base64,');
        }

        // Verify both calls were made
        expect(mockSend).toHaveBeenCalledTimes(2);

        // Verify enhancement call
        const enhancementCall = mockSend.mock.calls[0][0];
        expect(enhancementCall.input.messages[0].content[0].text).toBe(originalPrompt);
        expect(enhancementCall.input.system[0].text).toContain('professional photographer persona');

        // Verify image generation call
        const imageCall = mockSend.mock.calls[1][0];
        expect(imageCall.input.messages[0].content[0].text).toBe(`${enhancedPrompt} (aspect ratio 1:1)`);
    });

    it('should work end-to-end with off enhancement', async () => {
        const originalPrompt = 'A dog';

        // Mock only the image generation call (no enhancement call should be made)
        mockSend.mockResolvedValueOnce({
            output: {
                message: {
                    content: [
                        {
                            image: {
                                format: 'png',
                                source: {
                                    bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
                                }
                            }
                        }
                    ]
                }
            },
            stopReason: 'end_turn'
        });

        // Test persona enhancement (should return original)
        const enhancedPrompt = await bedrockService.enhancePrompt(originalPrompt, 'off');
        expect(enhancedPrompt).toBe(originalPrompt);

        // Test image generation
        const generationResult = await bedrockService.generateContent({
            prompt: `${originalPrompt} (aspect ratio 1:1)`,
            aspectRatio: '1:1',
            promptEnhancement: 'off'
        });

        expect(generationResult.type).toBe('image');

        // Only one call should be made (image generation, no enhancement)
        expect(mockSend).toHaveBeenCalledTimes(1);

        const imageCall = mockSend.mock.calls[0][0];
        expect(imageCall.input.messages[0].content[0].text).toBe(`${originalPrompt} (aspect ratio 1:1)`);
    });
});