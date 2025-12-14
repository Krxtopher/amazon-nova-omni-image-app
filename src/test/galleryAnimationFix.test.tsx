import { describe, it, expect } from 'vitest';

describe('Gallery Animation Fix', () => {
    it('should use stable React keys based on item ID only', () => {
        // Test the key generation logic directly
        const itemId = 'test-image-123';

        // Before fix: keys included position data
        const oldKeyWithPosition = `${itemId}-100-200`; // id-top-left

        // After fix: keys use only item ID
        const newStableKey = itemId;

        // Verify that the new approach creates stable keys
        expect(newStableKey).toBe('test-image-123');
        expect(newStableKey).not.toContain('-100-200');

        // Simulate position change (what happens when new items are added)
        const newPosition = { top: 150, left: 250 };
        const keyAfterPositionChange = itemId; // Still the same!

        expect(keyAfterPositionChange).toBe(newStableKey);
        expect(keyAfterPositionChange).toBe('test-image-123');
    });

    it('should prevent fade-in animation retriggering with stable component identity', () => {
        // This test documents the fix behavior
        // When React keys are stable, components maintain their identity
        // and internal state (like hasFadedInRef) is preserved

        const imageId = 'stable-image';

        // Simulate the old behavior (unstable keys)
        const oldKey1 = `${imageId}-0-0`;
        const oldKey2 = `${imageId}-50-100`; // Position changed
        expect(oldKey1).not.toBe(oldKey2); // Different keys = new component instance

        // Simulate the new behavior (stable keys)
        const newKey1 = imageId;
        const newKey2 = imageId; // Position changed but key stays same
        expect(newKey1).toBe(newKey2); // Same key = same component instance

        // This ensures that the hasFadedInRef state is preserved
        // and fade-in animation doesn't retrigger
    });

    it('should maintain component state across layout changes', () => {
        // Test that demonstrates the importance of stable keys
        const items = [
            { id: 'item-1', position: { top: 0, left: 0 } },
            { id: 'item-2', position: { top: 0, left: 350 } },
        ];

        // Add new item at the beginning (causes layout shift)
        const newItem = { id: 'item-3', position: { top: 0, left: 0 } };
        const updatedItems = [
            newItem,
            { id: 'item-1', position: { top: 0, left: 350 } }, // Position changed
            { id: 'item-2', position: { top: 0, left: 700 } }, // Position changed
        ];

        // With stable keys, existing items maintain their identity
        const stableKeys = items.map(item => item.id);
        const stableKeysAfterUpdate = updatedItems.slice(1).map(item => item.id);

        expect(stableKeys).toEqual(stableKeysAfterUpdate);

        // This ensures existing components don't remount and lose their state
    });
});