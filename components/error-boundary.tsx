"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="pixel-border bg-black p-8 max-w-md text-center">
            <h1 className="text-xl text-[var(--pixel-red)] mb-4">GAME OVER</h1>
            <p className="text-sm text-gray-400 mb-6">
              Something went wrong. The game has crashed.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[var(--pixel-green)] text-black py-2 px-4 hover:bg-[var(--pixel-dark-green)] transition-colors"
            >
              RESTART
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
