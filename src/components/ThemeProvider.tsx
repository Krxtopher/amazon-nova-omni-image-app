import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ReactNode } from 'react';

/**
 * Props for ThemeProvider
 */
interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * ThemeProvider component
 * Wraps the application with next-themes provider for theme support
 * Required by the Sonner toast component
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </NextThemesProvider>
    );
}
