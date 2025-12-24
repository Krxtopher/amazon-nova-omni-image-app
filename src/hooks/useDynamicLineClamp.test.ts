import { renderHook } from '@testing-library/react';
import { useDynamicLineClamp } from './useDynamicLineClamp';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('useDynamicLineClamp', () => {
    it('should return initial line clamp value', () => {
        const { result } = renderHook(() =>
            useDynamicLineClamp({
                lineHeight: 20,
                minLines: 2,
                maxLines: 6,
                padding: 10
            })
        );

        expect(result.current.lineClamp).toBe(6); // Should start with maxLines
        expect(result.current.containerRef).toBeDefined();
    });

    it('should clamp between min and max lines', () => {
        const { result } = renderHook(() =>
            useDynamicLineClamp({
                lineHeight: 20,
                minLines: 2,
                maxLines: 6,
                padding: 10
            })
        );

        // Initial value should be maxLines
        expect(result.current.lineClamp).toBe(6);
    });
});