"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("[ErrorBoundary] Caught error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleCopyError = () => {
    const { error } = this.state;
    if (error) {
      const errorDetails = `Error: ${error.message}\n\nStack:\n${error.stack}\n\nTimestamp: ${new Date().toISOString()}`;
      navigator.clipboard.writeText(errorDetails).then(() => {
        alert("Error details copied to clipboard");
      }).catch(() => {
        // Fallback if clipboard fails
        console.log("Error details:", errorDetails);
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="pixel-border bg-black p-8 max-w-md text-center">
            <h1 className="text-xl text-[var(--pixel-red)] mb-4">GAME OVER</h1>
            <p className="text-sm text-gray-400 mb-6">
              Something went wrong. The game has crashed.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-500 mb-4 font-mono truncate max-w-full">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-[var(--pixel-green)] text-black py-2 px-4 hover:bg-[var(--pixel-dark-green)] transition-colors"
              >
                RESTART
              </button>
              <button
                onClick={this.handleCopyError}
                className="bg-gray-700 text-white py-2 px-4 hover:bg-gray-600 transition-colors"
              >
                COPY ERROR
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
