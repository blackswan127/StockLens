import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Component'}] caught an error:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          className="p-4 m-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2 font-mono"
        >
          <AlertCircle aria-hidden="true" className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-sm text-rose-200">Something went wrong</h2>
            <p className="mt-1">
              <span className="font-bold">Error in {this.props.name || 'component'}:</span>{' '}
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 font-bold hover:bg-rose-500/20 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
