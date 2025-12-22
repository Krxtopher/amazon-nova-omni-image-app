import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Polyfill for Blob.arrayBuffer() in test environment
if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function () {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.onerror = () => {
                reject(reader.error);
            };
            reader.readAsArrayBuffer(this);
        });
    };
}

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
    constructor(_callback: ResizeObserverCallback) {
        // Mock implementation
    }
    observe() {
        // Mock implementation
    }
    unobserve() {
        // Mock implementation
    }
    disconnect() {
        // Mock implementation
    }
};

// Mock IndexedDB for tests
const mockIDBRequest = {
    result: null,
    error: null,
    onsuccess: null,
    onerror: null,
    readyState: 'done',
    source: null,
    transaction: null
};

const mockIDBDatabase = {
    name: 'test-db',
    version: 1,
    objectStoreNames: {
        contains: vi.fn(() => true),
        includes: vi.fn(() => true),
        length: 1,
        item: vi.fn(() => 'database'),
        [Symbol.iterator]: function* () {
            yield 'database';
        }
    },
    transaction: vi.fn(() => mockIDBTransaction),
    close: vi.fn(),
    createObjectStore: vi.fn(),
    deleteObjectStore: vi.fn()
};

const mockIDBTransaction = {
    objectStore: vi.fn(() => mockIDBObjectStore),
    abort: vi.fn(),
    db: mockIDBDatabase,
    error: null,
    mode: 'readwrite',
    oncomplete: null,
    onerror: null,
    onabort: null
};

const mockIDBObjectStore = {
    add: vi.fn(() => mockIDBRequest),
    clear: vi.fn(() => mockIDBRequest),
    count: vi.fn(() => mockIDBRequest),
    delete: vi.fn(() => mockIDBRequest),
    get: vi.fn(() => mockIDBRequest),
    getAll: vi.fn(() => mockIDBRequest),
    getAllKeys: vi.fn(() => mockIDBRequest),
    getKey: vi.fn(() => mockIDBRequest),
    put: vi.fn(() => mockIDBRequest),
    openCursor: vi.fn(() => mockIDBRequest),
    openKeyCursor: vi.fn(() => mockIDBRequest),
    createIndex: vi.fn(),
    deleteIndex: vi.fn(),
    index: vi.fn(),
    keyPath: null,
    name: 'test-store',
    transaction: mockIDBTransaction,
    autoIncrement: false,
    indexNames: []
};

global.indexedDB = {
    open: vi.fn(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
            request.result = mockIDBDatabase;
            if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
        return request as any;
    }),
    deleteDatabase: vi.fn(() => mockIDBRequest),
    databases: vi.fn(() => Promise.resolve([])),
    cmp: vi.fn()
} as any;

// Mock Canvas API for tests
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
})) as any;

// Mock WebGL context for shader tests
const mockWebGLContext = {
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    drawArrays: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    TRIANGLES: 4,
    COLOR_BUFFER_BIT: 16384
};

// Override getContext to return WebGL mock when requested
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string, ...args) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
        return mockWebGLContext;
    }
    return originalGetContext.call(this, contextType, ...args);
}) as any;

// Mock sql.js for tests
vi.mock('sql.js', () => ({
    default: vi.fn(() => Promise.resolve({
        Database: vi.fn(() => ({
            run: vi.fn(),
            exec: vi.fn(() => []),
            prepare: vi.fn(() => ({
                step: vi.fn(() => false),
                get: vi.fn(() => ({})),
                getAsObject: vi.fn(() => ({})),
                bind: vi.fn(),
                reset: vi.fn(),
                free: vi.fn()
            })),
            export: vi.fn(() => new Uint8Array()),
            close: vi.fn()
        }))
    }))
}));

// Mock AWS SDK for tests
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: vi.fn(() => ({
        send: vi.fn(),
        config: {
            region: vi.fn().mockReturnValue('us-east-1'),
            credentials: vi.fn().mockReturnValue({
                accessKeyId: 'test',
                secretAccessKey: 'test'
            })
        }
    })),
    InvokeModelCommand: vi.fn()
}));

// Cleanup after each test
afterEach(() => {
    cleanup()
})
