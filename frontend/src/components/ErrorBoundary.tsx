import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: "" };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error: error.toString() };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-center">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <h1 className="text-xl font-bold text-red-900 mb-2">Critical Error</h1>
                    <p className="text-xs text-red-700 mb-6 font-mono bg-red-100 p-3 rounded">
                        {this.state.error}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold"
                    >
                        Reload App
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
