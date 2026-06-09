import React, { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center bg-slate-900 text-white w-full h-full">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700/60 p-6 rounded-3xl shadow-premium space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="bg-rose-500/10 text-rose-500 p-3 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">Something went wrong</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">An unexpected error has crashed this page section.</p>
              </div>
            </div>
            
            {this.state.error && (
              <pre className="p-3 bg-slate-950 rounded-xl text-[9px] font-mono text-rose-400 overflow-x-auto max-h-[120px] whitespace-pre-wrap leading-relaxed select-all">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <button
              onClick={this.handleRetry}
              className="w-full bg-primary hover:bg-blue-600 text-white text-xs font-bold py-3 rounded-2xl transition shadow-lg shadow-blue-500/20 text-center"
            >
              Retry Connection
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
