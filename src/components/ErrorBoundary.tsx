import React, { ReactNode, ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for catching and handling React errors.
 * Prevents the entire app from crashing when a component fails.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <SomeComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to error reporting service (Sentry, etc)
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState(prevState => ({
      ...prevState,
      errorInfo,
    }));
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleHome = (): void => {
      // Use React Router Link for proper SPA navigation
      // This preserves app state and avoids full page reload
    };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h1 className="text-xl font-bold">Oops! Something went wrong</h1>
            </div>

            <p className="text-sm text-muted-foreground">
              We're sorry for the inconvenience. An unexpected error occurred while rendering this component.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="rounded-md bg-muted p-3 space-y-2">
                <p className="text-xs font-mono font-semibold text-destructive">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold">Stack trace</summary>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                              asChild
                              variant="outline"
                              className="flex-1"
                            >
                              <Link to="/">
                                <Home className="h-4 w-4 mr-2" />
                                Home
                              </Link>
                            </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
