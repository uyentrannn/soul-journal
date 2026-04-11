import React, { ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="font-serif-display text-4xl mb-4 italic">Something went wrong. ♡</h1>
          <p className="opacity-60 mb-8 max-w-md">
            The journal encountered an unexpected error. Don't worry, your entries are likely safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full hover:scale-105 transition-transform"
          >
            Refresh Journal
          </button>
          {(import.meta as any).env?.DEV && (
            <pre className="mt-8 p-4 bg-black/5 rounded text-left text-xs overflow-auto max-w-full">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return (this as any).props.children;
  }
}
