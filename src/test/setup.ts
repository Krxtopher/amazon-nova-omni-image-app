import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
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
    constructor(callback: ResizeObserverCallback) {
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

// Cleanup after each test
afterEach(() => {
    cleanup()
})
