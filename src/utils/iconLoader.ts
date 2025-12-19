/**
 * Utility for dynamically loading Lucide React icons at runtime
 * This allows icons to be loaded without compiling them into the application
 */

import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Dynamically loads a Lucide React icon by name
 * 
 * @param iconName - The name of the Lucide icon (e.g., "Palette", "Sparkles")
 * @returns The icon component or a fallback icon if not found
 */
export function loadIcon(iconName: string): LucideIcon {
    // Try to get the icon from the Lucide icons object
    const icon = (LucideIcons as any)[iconName];

    // Check if the icon exists and is a valid React component
    if (icon && typeof icon === 'object' && icon.$$typeof) {
        return icon as LucideIcon;
    }

    // Fallback to Edit icon if the requested icon is not found
    console.warn(`Icon "${iconName}" not found in Lucide React, using fallback icon`);
    return LucideIcons.Edit;
}

/**
 * Validates if an icon name exists in Lucide React
 * 
 * @param iconName - The name of the icon to validate
 * @returns True if the icon exists, false otherwise
 */
export function isValidIconName(iconName: string): boolean {
    const icon = (LucideIcons as any)[iconName];
    return !!(icon && typeof icon === 'object' && icon.$$typeof);
}

/**
 * Gets a list of all available Lucide icon names
 * Useful for debugging or providing icon selection UI
 * 
 * @returns Array of icon names
 */
export function getAvailableIconNames(): string[] {
    return Object.keys(LucideIcons).filter(key => {
        const value = (LucideIcons as any)[key];
        return value && typeof value === 'object' && value.$$typeof;
    });
}
