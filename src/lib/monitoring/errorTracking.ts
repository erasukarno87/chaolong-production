/**
 * Error Tracking & Monitoring System
 * 
 * Provides centralized error tracking, logging, and monitoring capabilities.
 * Integrates with Sentry for production error tracking.
 */

import { User } from '@supabase/supabase-js';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorContext {
  user?: User | null;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: ErrorContext;
  fingerprint?: string;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorReport[] = [];
  private maxErrors = 100;
  private sentryEnabled = false;
  private environment: string;

  private constructor() {
    this.environment = import.meta.env.MODE || 'development';
    this.initializeSentry();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private initializeSentry() {
    // Check if Sentry DSN is configured
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    
    if (sentryDsn && this.environment === 'production') {
      try {
        // Dynamically import Sentry only in production
        import('@sentry/react').then((Sentry) => {
          Sentry.init({
            dsn: sentryDsn,
            environment: this.environment,
            integrations: [
              Sentry.browserTracingIntegration(),
              Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
              }),
            ],
            tracesSampleRate: 0.1,
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
            beforeSend(event, hint) {
              // Filter out non-critical errors
              if (event.level === 'info' || event.level === 'debug') {
                return null;
              }
              return event;
            },
          });
          this.sentryEnabled = true;
          console.log('✅ Sentry initialized');
        }).catch((error) => {
          console.warn('⚠️ Failed to initialize Sentry:', error);
        });
      } catch (error) {
        console.warn('⚠️ Sentry initialization error:', error);
      }
    } else {
      console.log('ℹ️ Sentry disabled (development mode or no DSN configured)');
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        'error',
        {
          component: 'Global',
          action: 'unhandledRejection',
          metadata: { reason: event.reason },
        }
      );
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.captureError(
        event.error || new Error(event.message),
        'error',
        {
          component: 'Global',
          action: 'globalError',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        }
      );
    });
  }

  /**
   * Capture and log an error
   */
  captureError(
    error: Error | string,
    severity: ErrorSeverity = 'error',
    context?: ErrorContext
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorId = this.generateErrorId();

    const report: ErrorReport = {
      id: errorId,
      timestamp: new Date(),
      severity,
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      fingerprint: this.generateFingerprint(errorObj, context),
    };

    // Store locally
    this.errors.push(report);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (this.environment === 'development') {
      this.logToConsole(report);
    }

    // Send to Sentry in production
    if (this.sentryEnabled && this.environment === 'production') {
      this.sendToSentry(report);
    }

    // Store in localStorage for debugging
    this.persistError(report);

    return errorId;
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    context?: ErrorContext
  ): string {
    return this.captureError(new Error(message), severity, context);
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: User | null) {
    if (this.sentryEnabled) {
      import('@sentry/react').then((Sentry) => {
        if (user) {
          Sentry.setUser({
            id: user.id,
            email: user.email,
          });
        } else {
          Sentry.setUser(null);
        }
      });
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    message: string,
    category: string = 'default',
    level: ErrorSeverity = 'info',
    data?: Record<string, any>
  ) {
    if (this.sentryEnabled) {
      import('@sentry/react').then((Sentry) => {
        Sentry.addBreadcrumb({
          message,
          category,
          level: level as any,
          data,
          timestamp: Date.now() / 1000,
        });
      });
    }

    // Also log in development
    if (this.environment === 'development') {
      console.log(`[Breadcrumb] ${category}: ${message}`, data);
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errors.slice(-limit);
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
    localStorage.cache_controlItem('error_reports');
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error, context?: ErrorContext): string {
    const parts = [
      error.message,
      context?.component,
      context?.action,
    ].filter(Boolean);
    
    return parts.join('::');
  }

  /**
   * Log error to console with formatting
   */
  private logToConsole(report: ErrorReport) {
    const style = this.getConsoleStyle(report.severity);
    
    console.group(`%c[${report.severity.toUpperCase()}] ${report.message}`, style);
    console.log('Timestamp:', report.timestamp.toISOString());
    console.log('Error ID:', report.id);
    
    if (report.context) {
      console.log('Context:', report.context);
    }
    
    if (report.stack) {
      console.log('Stack:', report.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Get console style based on severity
   */
  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles: Record<ErrorSeverity, string> = {
      fatal: 'color: white; background-color: #dc2626; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      error: 'color: white; background-color: #ef4444; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      warning: 'color: black; background-color: #fbbf24; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      info: 'color: white; background-color: #3b82f6; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      debug: 'color: white; background-color: #6b7280; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
    };
    
    return styles[severity];
  }

  /**
   * Send error to Sentry
   */
  private sendToSentry(report: ErrorReport) {
    import('@sentry/react').then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setLevel(report.severity as any);
        scope.setFingerprint([report.fingerprint || report.message]);
        
        if (report.context) {
          if (report.context.component) {
            scope.setTag('component', report.context.component);
          }
          if (report.context.action) {
            scope.setTag('action', report.context.action);
          }
          if (report.context.tags) {
            Object.entries(report.context.tags).forEach(([key, value]) => {
              scope.setTag(key, value);
            });
          }
          if (report.context.metadata) {
            scope.setContext('metadata', report.context.metadata);
          }
        }
        
        Sentry.captureException(new Error(report.message));
      });
    });
  }

  /**
   * Persist error to localStorage
   */
  private persistError(report: ErrorReport) {
    try {
      const stored = localStorage.getItem('error_reports');
      const reports: ErrorReport[] = stored ? JSON.parse(stored) : [];
      
      reports.push(report);
      
      // Keep only last 50 errors
      if (reports.length > 50) {
        reports.shift();
      }
      
      localStorage.setItem('error_reports', JSON.stringify(reports));
    } catch (error) {
      console.warn('Failed to persist error:', error);
    }
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Convenience functions
export const captureError = (
  error: Error | string,
  severity?: ErrorSeverity,
  context?: ErrorContext
) => errorTracker.captureError(error, severity, context);

export const captureMessage = (
  message: string,
  severity?: ErrorSeverity,
  context?: ErrorContext
) => errorTracker.captureMessage(message, severity, context);

export const setUser = (user: User | null) => errorTracker.setUser(user);

export const addBreadcrumb = (
  message: string,
  category?: string,
  level?: ErrorSeverity,
  data?: Record<string, any>
) => errorTracker.addBreadcrumb(message, category, level, data);

export default errorTracker;