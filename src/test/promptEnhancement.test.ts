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

describe('Prompt Enhancement', () => {
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

    it('should return original prompt when enhancement is off', async () => {
        const originalPrompt = 'A beautiful sunset';
        const result = await bedrockService.enhancePrompt(originalPrompt, 'off');
        expect(result).toBe(originalPrompt);
        expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return original prompt when enhancement is custom', async () => {
        const originalPrompt = 'A beautiful sunset';
        const result = await bedrockService.enhancePrompt(originalPrompt, 'custom');
        expect(result).toBe(originalPrompt);
        expect(mockSend).not.toHaveBeenCalled();
    });

    it('should call Nova 2 Omni for standard enhancement', async () => {
        const originalPrompt = 'A beautiful sunset';
        const enhancedPrompt = 'A breathtaking sunset with vibrant orange and pink hues painting the sky, professional photography, high quality, detailed';

        mockSend.mockResolvedValue({
            output: {
                message: {
                    content: [
                        { text: enhancedPrompt }
                    ]
                }
            }
        });

        const result = await bedrockService.enhancePrompt(originalPrompt, 'standard');

        expect(result).toBe(enhancedPrompt);
        expect(mockSend).toHaveBeenCalledTimes(1);

        const callArgs = mockSend.mock.calls[0][0];
        expect(callArgs.input.modelId).toBe('us.amazon.nova-2-omni-v1:0');
        expect(callArgs.input.messages[0].content[0].text).toBe(originalPrompt);
        expect(callArgs.input.system[0].text).toContain('prompt enhancement assistant');
    });

    it('should call Nova 2 Omni for creative enhancement', async () => {
        const originalPrompt = 'A cat';
        const enhancedPrompt = 'A majestic cat with piercing eyes, dramatic lighting, artistic composition, cinematic atmosphere, vibrant colors';

        mockSend.mockResolvedValue({
            output: {
                message: {
                    content: [
                        { text: enhancedPrompt }
                    ]
                }
            }
        });

        const result = await bedrockService.enhancePrompt(originalPrompt, 'creative');

        expect(result).toBe(enhancedPrompt);
        expect(mockSend).toHaveBeenCalledTimes(1);

        const callArgs = mockSend.mock.calls[0][0];
        expect(callArgs.input.system[0].text).toContain('creative prompt enhancement assistant');
    });

    it('should fallback to original prompt if enhancement fails', async () => {
        const originalPrompt = 'A dog';

        mockSend.mockRejectedValue(new Error('API Error'));

        const result = await bedrockService.enhancePrompt(originalPrompt, 'standard');

        expect(result).toBe(originalPrompt);
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should fallback to original prompt if response has no text content', async () => {
        const originalPrompt = 'A bird';

        mockSend.mockResolvedValue({
            output: {
                message: {
                    content: []
                }
            }
        });

        const result = await bedrockService.enhancePrompt(originalPrompt, 'standard');

        expect(result).toBe(originalPrompt);
        expect(mockSend).toHaveBeenCalledTimes(1);
    });
});