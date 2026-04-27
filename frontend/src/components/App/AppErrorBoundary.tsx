/**
 * Story 14c-refactor.11: AppErrorBoundary - Theme-aware error boundary for App
 *
 * Enhanced error boundary that integrates with the theme system for consistent
 * styling. Provides user-friendly error display with reload capability.
 *
 * Features:
 * - Theme-aware styling (light/dark mode support)
 * - CSS variable integration for consistent design
 * - Detailed error message display (dev-friendly)
 * - One-click app reload
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 *
 * @example
 * ```tsx
 * <AppErrorBoundary>
 *   <App />
 * </AppErrorBoundary>
 * ```
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface AppErrorBoundaryProps {
    children: ReactNode;
}

interface AppErrorBoundaryState {
    hasError: boolean;
    error: string;
    errorInfo: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Theme-aware error boundary for the app.
 *
 * Catches React render errors and displays a styled fallback UI
 * that matches the app's design system.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    constructor(props: AppErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: '',
            errorInfo: '',
        };
    }

    static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
        return {
            hasError: true,
            error: error.message || error.toString(),
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error details for debugging
        console.error('[AppErrorBoundary] Caught error:', error);
        console.error('[AppErrorBoundary] Error info:', errorInfo);

        this.setState({
            errorInfo: errorInfo.componentStack || '',
        });
    }

    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div
                    className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
                    style={{
                        backgroundColor: 'var(--bg, #fef2f2)',
                        color: 'var(--text-primary, #1e293b)',
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                        style={{
                            backgroundColor: 'var(--error-bg, #fee2e2)',
                        }}
                    >
                        <AlertTriangle
                            size={32}
                            style={{ color: 'var(--error, #ef4444)' }}
                        />
                    </div>

                    <h1
                        className="text-xl font-bold mb-2"
                        style={{ color: 'var(--error, #dc2626)' }}
                    >
                        Critical Error
                    </h1>

                    <p
                        className="text-sm mb-4 max-w-md"
                        style={{ color: 'var(--text-secondary, #64748b)' }}
                    >
                        Something went wrong. Please reload the app to continue.
                    </p>

                    {/* Error details - show full info in dev, minimal in prod (AC #6, Task 2.4) */}
                    <div
                        className="text-xs font-mono p-4 rounded-lg mb-6 max-w-lg w-full overflow-auto text-left"
                        style={{
                            backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                            color: 'var(--text-tertiary, #94a3b8)',
                            maxHeight: '150px',
                        }}
                    >
                        <strong>Error:</strong> {this.state.error}
                        {/* Story 14c-refactor.11: Stack trace only in development mode */}
                        {import.meta.env.DEV && this.state.errorInfo && (
                            <>
                                <br />
                                <br />
                                <strong>Stack:</strong>
                                <pre className="whitespace-pre-wrap text-[10px] mt-1">
                                    {this.state.errorInfo}
                                </pre>
                            </>
                        )}
                    </div>

                    <button
                        onClick={this.handleReload}
                        className="px-6 py-3 rounded-xl font-bold text-white transition-all active:scale-95"
                        style={{
                            backgroundColor: 'var(--primary, #ef4444)',
                        }}
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AppErrorBoundary;
