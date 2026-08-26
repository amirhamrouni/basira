import React from 'react';
import { analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Crash trapped by ErrorBoundary", error, errorInfo);
        if (analytics) {
            logEvent(analytics, 'exception', {
                description: error.message,
                fatal: true
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
                    <h2 className="text-xl font-bold text-red-500 mb-2">A cosmic interference occurred</h2>
                    <p className="text-gray-400 text-sm mb-4">Our spiritual connection was temporarily disrupted.</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-stella-gold text-black font-bold py-2 px-6 rounded-xl hover:brightness-110 transition-all font-amiri"
                    >
                        Restore Connection
                    </button>
                    <pre className="mt-4 p-4 bg-black/50 text-red-300 text-left text-xs rounded overflow-auto max-w-full whitespace-pre-wrap">
                        Error: {this.state.error?.message}
                        {"\n\nStack: " + this.state.error?.stack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}
