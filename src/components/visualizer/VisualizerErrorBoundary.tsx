import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class VisualizerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Visualizer error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-full flex items-center justify-center bg-red-100 border border-red-300 rounded">
          <div className="text-center p-4">
            <div className="text-red-600 text-lg mb-2">⚠️ Visualizer Error</div>
            <div className="text-red-500 text-sm">
              {this.state.error?.message || 'Failed to render visualizer'}
            </div>
            <button 
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default VisualizerErrorBoundary;