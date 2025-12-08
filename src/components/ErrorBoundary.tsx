import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
    children: ReactNode;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component
 * Catches and displays runtime errors in the React component tree
 * Provides recovery options and logs errors for debugging
 * 
 * Requirements: 1.5
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    /**
     * Update state when an error is caught
     */
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    /**
     * Log error details when an error is caught
     */
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error for debugging
        console.error('ErrorBoundary caught an error:', error);
        console.error('Error info:', errorInfo);

        // Update state with error info
        this.setState({
            errorInfo,
        });

        // You could also send error to an error reporting service here
    }

    /**
     * Handle recovery by resetting error state
     */
    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    /**
     * Handle page reload
     */
    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full space-y-6 text-center">
                        {/* Error Icon */}
                        <div className="flex justify-center">
                            <div className="rounded-full bg-destructive/10 p-4">
                                <AlertCircle className="h-12 w-12 text-destructive" />
                            </div>
                        </div>

                        {/* Error Message */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">
                                Something went wrong
                            </h1>
                            <p className="text-muted-foreground">
                                We encountered an unexpected error. Please try one of the recovery options below.
                            </p>
                        </div>

                        {/* Error Details (in development) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-muted rounded-lg p-4 text-left">
                                <p className="text-sm font-mono text-destructive break-all">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="mt-2">
                                        <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                                            Stack trace
                                        </summary>
                                        <pre className="mt-2 text-xs font-mono text-muted-foreground overflow-auto max-h-40">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Recovery Options */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                                onClick={this.handleReset}
                                variant="default"
                                size="lg"
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={this.handleReload}
                                variant="outline"
                                size="lg"
                            >
                                Reload Page
                            </Button>
                        </div>

                        {/* Additional Help */}
                        <p className="text-sm text-muted-foreground">
                            If the problem persists, please check your AWS credentials and network connection.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
