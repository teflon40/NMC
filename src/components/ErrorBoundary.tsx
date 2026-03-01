import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-red-50/50 rounded-lg border border-red-100 m-4">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <AlertOctagon className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong.</h2>
                    <p className="text-gray-600 mb-6 max-w-md">
                        An unexpected error occurred while rendering this module. We've logged the issue.
                    </p>

                    {this.state.error && (
                        <div className="bg-white/80 p-4 rounded border border-red-200 text-left w-full max-w-2xl overflow-auto mb-6 text-sm">
                            <p className="font-mono text-red-700 font-semibold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                        </div>
                    )}

                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 bg-white border border-gray-300 px-6 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" /> Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
