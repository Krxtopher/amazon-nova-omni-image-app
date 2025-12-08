import { createContext, useContext, type ReactNode } from 'react';
import { BedrockImageService } from '@/services/BedrockImageService';

/**
 * Context for providing BedrockImageService throughout the application
 * Requirements: 10.3
 */
const BedrockServiceContext = createContext<BedrockImageService | null>(null);

/**
 * Props for BedrockServiceProvider
 */
interface BedrockServiceProviderProps {
    service: BedrockImageService;
    children: ReactNode;
}

/**
 * Provider component for BedrockImageService
 * Wraps the application and provides the service instance to all child components
 */
export function BedrockServiceProvider({ service, children }: BedrockServiceProviderProps) {
    return (
        <BedrockServiceContext.Provider value={service}>
            {children}
        </BedrockServiceContext.Provider>
    );
}

/**
 * Hook to access the BedrockImageService from context
 * @throws Error if used outside of BedrockServiceProvider
 */
export function useBedrockService(): BedrockImageService {
    const service = useContext(BedrockServiceContext);

    if (!service) {
        throw new Error('useBedrockService must be used within a BedrockServiceProvider');
    }

    return service;
}
