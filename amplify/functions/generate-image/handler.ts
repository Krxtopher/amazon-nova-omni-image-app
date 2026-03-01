import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface GenerationRequest {
    prompt: string;
    aspectRatio?: string;
    customSystemPrompt?: string;
    identityId?: string;
    editSource?: {
        url: string;
    };
}

type GenerationResponse =
    | { type: 'image'; s3Key: string; imageId: string; format: string; width: number; height: number }
    | { type: 'text'; text: string }
    | { type: 'error'; error: string };

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Max-Age': '86400',
};

const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || '';

/**
 * Lambda handler for Bedrock image generation.
 * Generates an image via InvokeModel, writes it to S3, and returns the S3 key.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('[STEP 1] Handler invoked', {
        httpMethod: event.httpMethod,
        path: event.path,
        timestamp: new Date().toISOString(),
    });

    try {
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers: CORS_HEADERS, body: '' };
        }

        if (event.httpMethod !== 'POST') {
            return respond(405, { type: 'error', error: 'Method not allowed. Use POST.' });
        }

        if (!event.body) {
            return respond(400, { type: 'error', error: 'Request body is required' });
        }

        let requestBody: GenerationRequest;
        try {
            requestBody = JSON.parse(event.body);
        } catch {
            return respond(400, { type: 'error', error: 'Invalid JSON in request body' });
        }

        if (!requestBody.prompt || typeof requestBody.prompt !== 'string') {
            return respond(400, { type: 'error', error: 'Missing or invalid prompt field' });
        }

        console.log('[STEP 2] Prompt validated, length:', requestBody.prompt.length);

        // Build InvokeModel request
        const region = process.env.BEDROCK_REGION || 'us-east-1';
        const bedrockClient = new BedrockRuntimeClient({ region });
        const modelId = 'us.amazon.nova-2-omni-v1:0';

        const systemPrompt = requestBody.customSystemPrompt ||
            'Interpret all user messages as image generation requests. Never ask for clarification. Ambiguous requests are allowed.';

        const invokeBody = {
            messages: [{ role: 'user', content: [{ text: requestBody.prompt }] }],
            system: [{ text: systemPrompt }],
        };

        console.log('[STEP 3] Calling InvokeModel, model:', modelId);
        const startTime = Date.now();

        const command = new InvokeModelCommand({
            modelId,
            body: JSON.stringify(invokeBody),
            contentType: 'application/json',
            accept: 'application/json',
        });

        const response = await bedrockClient.send(command);
        console.log('[STEP 4] InvokeModel responded in', Date.now() - startTime, 'ms');

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        console.log('[STEP 5] Response parsed, stopReason:', responseBody.stopReason);

        const result = parseModelResponse(responseBody);

        // If the model returned text or error, return immediately (small payload)
        if (result.type !== 'image') {
            console.log('[STEP 6] Non-image result:', result.type);
            return respond(200, result);
        }

        // Write image to S3
        console.log('[STEP 6] Writing image to S3, bucket:', BUCKET_NAME);
        const { s3Key, imageId, width, height } = await writeImageToS3(
            result.base64Data,
            result.format,
            requestBody.identityId
        );
        console.log('[STEP 7] Image written to S3, key:', s3Key, 'dimensions:', width, 'x', height);

        return respond(200, { type: 'image', s3Key, imageId, format: result.format, width, height });

    } catch (error) {
        console.error('[CATCH] Unhandled error:', {
            name: error instanceof Error ? error.name : 'unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        let statusCode = 500;
        let errorMessage = 'Internal server error';

        if (error && typeof error === 'object' && 'name' in error) {
            const awsError = error as { name: string; message: string; $metadata?: { httpStatusCode?: number } };
            if (awsError.name === 'ThrottlingException' || awsError.$metadata?.httpStatusCode === 429) {
                statusCode = 429;
                errorMessage = 'Too many requests. Please wait and try again.';
            } else if (awsError.name === 'ValidationException' || awsError.$metadata?.httpStatusCode === 400) {
                statusCode = 400;
                errorMessage = `Invalid request: ${awsError.message}`;
            } else if (awsError.name === 'ServiceUnavailableException' || awsError.$metadata?.httpStatusCode === 503) {
                statusCode = 503;
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            }
        }

        return respond(statusCode, { type: 'error', error: errorMessage });
    }
};

function respond(statusCode: number, body: object): APIGatewayProxyResult {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        body: JSON.stringify(body),
    };
}

type ParsedResult =
    | { type: 'image'; base64Data: string; format: string }
    | { type: 'text'; text: string }
    | { type: 'error'; error: string };

function parseModelResponse(responseBody: any): ParsedResult {
    try {
        if (responseBody.stopReason && responseBody.stopReason !== 'end_turn') {
            return { type: 'error', error: `Unexpected stop reason: ${responseBody.stopReason}` };
        }

        const content = responseBody.output?.message?.content;
        if (!content) {
            return { type: 'error', error: 'Invalid response structure: missing content' };
        }

        const textBlock = content.find((item: any) => item.text !== undefined);
        if (textBlock?.text) {
            return { type: 'text', text: textBlock.text };
        }

        const imageBlock = content.find((item: any) => item.image !== undefined);
        if (imageBlock?.image?.source?.bytes) {
            const base64 = imageBlock.image.source.bytes;
            const format = imageBlock.image.format || 'png';
            return { type: 'image', base64Data: base64, format };
        }

        return { type: 'error', error: 'No image or text content found in response' };
    } catch (error) {
        console.error('Parse response error:', error);
        return { type: 'error', error: error instanceof Error ? error.message : 'Failed to parse response' };
    }
}

async function writeImageToS3(
    base64Data: string,
    format: string,
    identityId?: string
): Promise<{ s3Key: string; imageId: string; width: number; height: number }> {
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

    const imageId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const extension = format === 'jpeg' ? 'jpg' : format;
    const fileName = `image_${imageId}.${extension}`;

    // Amplify Storage access rule: images/{entity_id}/*
    // {entity_id} resolves to the Cognito Identity Pool identity ID.
    // The frontend passes this as `identityId`.
    const userFolder = identityId || 'lambda-generated';
    const s3Key = `images/${userFolder}/${fileName}`;

    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Extract actual image dimensions from the raw bytes
    const { width, height } = getImageDimensions(imageBuffer, format);

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: `image/${format}`,
        Metadata: {
            generatedAt: new Date().toISOString(),
            source: 'bedrock-nova',
            width: String(width),
            height: String(height),
        },
    }));

    return { s3Key, imageId, width, height };
}

/**
 * Extract width and height from raw image bytes.
 * Supports PNG (IHDR chunk) and JPEG (SOF markers) without external dependencies.
 */
function getImageDimensions(buffer: Buffer, format: string): { width: number; height: number } {
    try {
        if (format === 'png') {
            return getPngDimensions(buffer);
        }
        if (format === 'jpeg' || format === 'jpg') {
            return getJpegDimensions(buffer);
        }
    } catch (e) {
        console.warn('Failed to extract image dimensions:', e);
    }
    // Fallback — unknown format or parse failure
    return { width: 0, height: 0 };
}

function getPngDimensions(buffer: Buffer): { width: number; height: number } {
    // PNG spec: bytes 16-19 = width, 20-23 = height (big-endian uint32 in IHDR)
    if (buffer.length < 24) throw new Error('Buffer too small for PNG');
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
}

function getJpegDimensions(buffer: Buffer): { width: number; height: number } {
    // Scan for SOF0-SOF15 markers (0xFFC0-0xFFCF, excluding 0xFFC4 DHT and 0xFFCC DAC)
    let offset = 2; // skip SOI marker (0xFFD8)
    while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xFF) {
            offset++;
            continue;
        }
        const marker = buffer[offset + 1];
        // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
        if (
            (marker >= 0xC0 && marker <= 0xCF) &&
            marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC
        ) {
            // SOF segment: length(2) + precision(1) + height(2) + width(2)
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
        }
        // Skip to next marker using segment length
        if (offset + 3 < buffer.length) {
            const segmentLength = buffer.readUInt16BE(offset + 2);
            offset += 2 + segmentLength;
        } else {
            break;
        }
    }
    throw new Error('No SOF marker found in JPEG');
}
