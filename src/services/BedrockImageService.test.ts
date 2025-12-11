import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BedrockImageService } from './BedrockImageService';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { GenerationRequest } from '../types';

describe('BedrockImageService', () => {
    const mockCredentials: AwsCredentialIdentity = {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
    };

    const config = {
        region: 'us-east-1',
        credentials: mockCredentials,
    };

    describe('constructor', () => {
        it('should initialize with provided configuration', () => {
            const service = new BedrockImageService(config);
            expect(service).toBeInstanceOf(BedrockImageService);
        });

        it('should set the correct model ID', () => {
            const service = new BedrockImageService(config);
            expect(service.getModelId()).toBe('us.amazon.nova-2-omni-v1:0');
        });

        it('should configure the correct region', async () => {
            const service = new BedrockImageService(config);
            const region = await service.getRegion();
            expect(region).toBe('us-east-1');
        });
    });

    describe('encodeImageToBytes', () => {
        let service: BedrockImageService;

        beforeEach(() => {
            service = new BedrockImageService(config);
        });

        it('should encode a File object to Uint8Array', async () => {
            // Create a mock File with some binary data
            const fileContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
            const file = new File([fileContent], 'test.png', { type: 'image/png' });

            const result = await service.encodeImageToBytes(file);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(fileContent.length);
            expect(Array.from(result)).toEqual(Array.from(fileContent));
        });

        it('should encode a Blob object to Uint8Array', async () => {
            // Create a mock Blob with some binary data
            const blobContent = new Uint8Array([255, 216, 255, 224]); // JPEG header
            const blob = new Blob([blobContent], { type: 'image/jpeg' });

            const result = await service.encodeImageToBytes(blob);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(blobContent.length);
            expect(Array.from(result)).toEqual(Array.from(blobContent));
        });

        it('should encode a data URL to Uint8Array', async () => {
            // Create a simple base64 encoded data URL
            const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
            const base64 = btoa(String.fromCharCode(...binaryData));
            const dataUrl = `data:image/png;base64,${base64}`;

            const result = await service.encodeImageToBytes(dataUrl);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(Array.from(result)).toEqual(Array.from(binaryData));
        });

        it('should handle blob URLs by fetching the blob', async () => {
            const blobContent = new Uint8Array([10, 20, 30, 40]);
            const blob = new Blob([blobContent], { type: 'image/png' });
            const blobUrl = URL.createObjectURL(blob);

            const result = await service.encodeImageToBytes(blobUrl);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(blobContent.length);
            expect(Array.from(result)).toEqual(Array.from(blobContent));

            // Clean up
            URL.revokeObjectURL(blobUrl);
        });

        it('should throw error for invalid data URL format', async () => {
            const invalidDataUrl = 'data:invalid-format';

            await expect(service.encodeImageToBytes(invalidDataUrl)).rejects.toThrow(
                'Failed to encode image: Invalid data URL format'
            );
        });

        it('should throw error for unsupported image source type', async () => {
            // @ts-expect-error Testing invalid input
            await expect(service.encodeImageToBytes(123)).rejects.toThrow(
                'Failed to encode image: Unsupported image source type'
            );
        });

        it('should throw error when fetch fails for blob URL', async () => {
            const invalidBlobUrl = 'blob:invalid-url';

            await expect(service.encodeImageToBytes(invalidBlobUrl)).rejects.toThrow(
                'Failed to encode image'
            );
        });

        it('should handle empty File objects', async () => {
            const emptyFile = new File([], 'empty.png', { type: 'image/png' });

            const result = await service.encodeImageToBytes(emptyFile);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(0);
        });

        it('should preserve binary data integrity for large files', async () => {
            // Create a larger binary array to test data integrity
            const largeData = new Uint8Array(1024);
            for (let i = 0; i < largeData.length; i++) {
                largeData[i] = i % 256;
            }
            const file = new File([largeData], 'large.png', { type: 'image/png' });

            const result = await service.encodeImageToBytes(file);

            expect(result.length).toBe(largeData.length);
            expect(Array.from(result)).toEqual(Array.from(largeData));
        });
    });

    describe('generateContent', () => {
        let service: BedrockImageService;

        beforeEach(() => {
            service = new BedrockImageService(config);
        });

        it('should generate an image from a text prompt', async () => {
            // Mock the Bedrock client send method
            const mockImageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
            const mockResponse = {
                output: {
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                image: {
                                    format: 'png',
                                    source: {
                                        bytes: mockImageBytes,
                                    },
                                },
                            },
                        ],
                    },
                },
            };

            // @ts-expect-error Accessing private client for testing
            vi.spyOn(service.client, 'send').mockResolvedValue(mockResponse);

            const request: GenerationRequest = {
                prompt: 'A beautiful sunset over mountains',
                aspectRatio: '16:9',
            };

            const result = await service.generateContent(request);

            expect(result.type).toBe('image');
            if (result.type === 'image') {
                expect(result.imageDataUrl).toContain('data:image/png;base64,');
                expect(result.imageDataUrl).toBeTruthy();
                expect(result.converseParams).toBeDefined();
                expect(result.converseParams.modelId).toBe('us.amazon.nova-2-omni-v1:0');
                expect(result.converseParams.messages).toHaveLength(1);
                expect(result.converseParams.messages[0].content).toHaveLength(1);
                expect(result.converseParams.messages[0].content[0].text).toBe('A beautiful sunset over mountains');
            }
        });

        it('should generate an image with edit source', async () => {
            // Mock the Bedrock client send method
            const mockImageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
            const mockResponse = {
                output: {
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                image: {
                                    format: 'png',
                                    source: {
                                        bytes: mockImageBytes,
                                    },
                                },
                            },
                        ],
                    },
                },
            };

            // @ts-expect-error Accessing private client for testing
            vi.spyOn(service.client, 'send').mockResolvedValue(mockResponse);

            const editSourceBytes = new Uint8Array([255, 216, 255, 224]);
            const editSourceBase64 = btoa(String.fromCharCode(...editSourceBytes));
            const editSourceUrl = `data:image/jpeg;base64,${editSourceBase64}`;

            const request: GenerationRequest = {
                prompt: 'Make it more colorful',
                editSource: {
                    url: editSourceUrl,
                    aspectRatio: '1:1',
                    width: 1024,
                    height: 1024,
                },
            };

            const result = await service.generateContent(request);

            expect(result.type).toBe('image');
            if (result.type === 'image') {
                expect(result.imageDataUrl).toContain('data:image/png;base64,');
                expect(result.imageDataUrl).toBeTruthy();
                expect(result.converseParams).toBeDefined();
                expect(result.converseParams.modelId).toBe('us.amazon.nova-2-omni-v1:0');
                expect(result.converseParams.messages).toHaveLength(1);
                expect(result.converseParams.messages[0].content).toHaveLength(2); // image + text
                expect(result.converseParams.messages[0].content[0].image).toBeDefined();
                expect(result.converseParams.messages[0].content[0].image?.source._base64).toBeDefined();
                expect(result.converseParams.messages[0].content[1].text).toBe('Make it more colorful');
            }
        });

        it('should return text response when model generates text', async () => {
            // Mock the Bedrock client to return text
            const mockResponse = {
                output: {
                    message: {
                        role: 'assistant',
                        content: [
                            {
                                text: 'I cannot generate that image because it violates content policy.',
                            },
                        ],
                    },
                },
            };

            // @ts-expect-error Accessing private client for testing
            vi.spyOn(service.client, 'send').mockResolvedValue(mockResponse);

            const request: GenerationRequest = {
                prompt: 'Test prompt',
                aspectRatio: '1:1',
            };

            const result = await service.generateContent(request);

            expect(result.type).toBe('text');
            if (result.type === 'text') {
                expect(result.text).toBe('I cannot generate that image because it violates content policy.');
                expect(result.converseParams).toBeDefined();
                expect(result.converseParams.modelId).toBe('us.amazon.nova-2-omni-v1:0');
                expect(result.converseParams.messages).toHaveLength(1);
                expect(result.converseParams.messages[0].content).toHaveLength(1);
                expect(result.converseParams.messages[0].content[0].text).toBe('Test prompt');
            }
        });

        it('should handle API errors gracefully', async () => {
            // Mock an API error
            const mockError = {
                name: 'ValidationException',
                message: 'Invalid prompt',
                $metadata: { httpStatusCode: 400 },
            };

            // @ts-expect-error Accessing private client for testing
            vi.spyOn(service.client, 'send').mockRejectedValue(mockError);

            const request: GenerationRequest = {
                prompt: 'Test prompt',
                aspectRatio: '1:1',
            };

            await expect(service.generateContent(request)).rejects.toMatchObject({
                message: 'Invalid request: Invalid prompt',
                category: 'validation',
                retryable: false,
            });
        });

        it('should handle network errors', async () => {
            // Mock a network error
            const mockError = new TypeError('fetch failed');

            // @ts-expect-error Accessing private client for testing
            vi.spyOn(service.client, 'send').mockRejectedValue(mockError);

            const request: GenerationRequest = {
                prompt: 'Test prompt',
                aspectRatio: '1:1',
            };

            await expect(service.generateContent(request)).rejects.toMatchObject({
                message: 'Network error. Please check your connection and try again.',
                category: 'network',
                retryable: true,
            });
        });

        it('should handle malformed API responses', async () => {
            // Mock a response with no content
            const mockResponse = {
                output: {
                    message: {
                        role: 'assistant',
                        content: [],
                    },
                },
            };

            // @ts-expect-error Accessing private client for testing
            vi.spyOn(service.client, 'send').mockResolvedValue(mockResponse);

            const request: GenerationRequest = {
                prompt: 'Test prompt',
                aspectRatio: '1:1',
            };

            await expect(service.generateContent(request)).rejects.toThrow();
        });

        it('should handle throttling errors as retryable', async () => {
            const mockError = {
                name: 'ThrottlingException',
                message: 'Rate exceeded',
                $metadata: { httpStatusCode: 429 },
            };

            // @ts-expect-error Accessing private client for testing
            vi.spyOn(service.client, 'send').mockRejectedValue(mockError);

            const request: GenerationRequest = {
                prompt: 'Test prompt',
                aspectRatio: '1:1',
            };

            await expect(service.generateContent(request)).rejects.toMatchObject({
                message: 'Too many requests. Please wait a moment and try again.',
                category: 'api',
                retryable: true,
            });
        });
    });
});
