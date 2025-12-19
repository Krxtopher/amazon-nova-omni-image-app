import { describe, it, expect } from 'vitest';
import { loadIcon, isValidIconName, getAvailableIconNames } from '../utils/iconLoader';
import { Edit, Palette, Sparkles } from 'lucide-react';

describe('Icon Loader', () => {
    describe('loadIcon', () => {
        it('should load valid Lucide icons', () => {
            const EditIcon = loadIcon('Edit');
            const PaletteIcon = loadIcon('Palette');
            const SparklesIcon = loadIcon('Sparkles');

            expect(EditIcon).toBe(Edit);
            expect(PaletteIcon).toBe(Palette);
            expect(SparklesIcon).toBe(Sparkles);
        });

        it('should return fallback icon for invalid names', () => {
            const InvalidIcon = loadIcon('NonExistentIcon');
            const EmptyIcon = loadIcon('');

            expect(InvalidIcon).toBe(Edit);
            expect(EmptyIcon).toBe(Edit);
        });

        it('should handle case-sensitive icon names', () => {
            const ValidIcon = loadIcon('Edit');
            const InvalidCaseIcon = loadIcon('edit'); // lowercase

            expect(ValidIcon).toBe(Edit);
            expect(InvalidCaseIcon).toBe(Edit); // Should fallback to Edit
        });
    });

    describe('isValidIconName', () => {
        it('should validate existing icon names', () => {
            expect(isValidIconName('Edit')).toBe(true);
            expect(isValidIconName('Palette')).toBe(true);
            expect(isValidIconName('Sparkles')).toBe(true);
        });

        it('should reject invalid icon names', () => {
            expect(isValidIconName('NonExistentIcon')).toBe(false);
            expect(isValidIconName('')).toBe(false);
            expect(isValidIconName('edit')).toBe(false); // case-sensitive
        });
    });

    describe('getAvailableIconNames', () => {
        it('should return an array of icon names', () => {
            const iconNames = getAvailableIconNames();

            expect(Array.isArray(iconNames)).toBe(true);
            expect(iconNames.length).toBeGreaterThan(0);
            expect(iconNames).toContain('Edit');
            expect(iconNames).toContain('Palette');
            expect(iconNames).toContain('Sparkles');
        });

        it('should only return function names (valid icons)', () => {
            const iconNames = getAvailableIconNames();

            // All returned names should be valid icons
            iconNames.forEach(name => {
                expect(isValidIconName(name)).toBe(true);
            });
        });
    });
});