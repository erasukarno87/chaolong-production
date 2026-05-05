import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  component?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class MonitoringErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Monitoring Error Boundary caught an error:", error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Monitoring Error</h2>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Something went wrong while loading the monitoring dashboard.
              </p>
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {this.props.component || "Unknown Component"}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  {this.state.errorId}
                </Badge>
              </div>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <pre className="text-xs overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <div className="mt-2">
                        <strong>Component Stack:</strong>
                        <br />
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={this.handleRetry} className="flex-1 gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withMonitoringErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: { fallback?: ReactNode; component?: string }
) {
  return function WrappedComponent(props: P) {
    return (
      <MonitoringErrorBoundary
        component={options?.component}
        fallback={options?.fallback}
      >
        <Component {...props} />
      </MonitoringErrorBoundary>
    );
  };
}

/**
 * Simple error boundary for individual panels
 */
export function PanelErrorBoundary({ 
  children, 
  title = "Panel",
  onRetry 
}: { 
  children: ReactNode;
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <MonitoringErrorBoundary
      component={title}
      fallback={
        <Card className="p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-sm font-medium text-foreground mb-1">
            {title} Error
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Unable to load {title.toLowerCase()} data
          </p>
          <Button size="sm" onClick={onRetry} className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </Card>
      }
    >
      {children}
    </MonitoringErrorBoundary>
  );
}
