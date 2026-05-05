/**
 * Global Error Handler & Logging System
 * Production-grade error handling and reporting
 */

import { ErrorInfo } from "react";

export interface ErrorReport {
  id: string;
  timestamp: Date;
  type: "component" | "network" | "validation" | "business" | "system";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details?: any;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string | null;
  sessionId?: string;
  buildVersion?: string;
}

export interface ErrorHandlerOptions {
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxErrors: number;
  enableUserFeedback: boolean;
  environment: "development" | "staging" | "production";
}

class ErrorHandler {
  private options: ErrorHandlerOptions;
  private errors: ErrorReport[] = [];
  private sessionId: string;
  private buildVersion: string;

  constructor(options: Partial<ErrorHandlerOptions> = {}) {
    this.options = {
      enableConsole: true,
      enableRemote: false,
      maxErrors: 100,
      enableUserFeedback: true,
      environment: (process.env.NODE_ENV as any) || "development",
      ...options,
    };

    this.sessionId = this.generateSessionId();
    this.buildVersion = process.env.REACT_APP_VERSION || "unknown";
    this.setupGlobalHandlers();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener("error", (event) => {
      this.handleError({
        type: "system",
        severity: "high",
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        stack: event.error?.stack,
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError({
        type: "system",
        severity: "high",
        message: "Unhandled Promise Rejection",
        details: {
          reason: event.reason,
        },
        stack: event.reason?.stack,
      });
    });
  }

  private createErrorReport(
    error: Error,
    errorInfo?: ErrorInfo,
    type: ErrorReport["type"] = "component",
    severity: ErrorReport["severity"] = "medium"
  ): ErrorReport {
    return {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type,
      severity,
      message: error.message,
      details: {
        name: error.name,
        ...errorInfo,
      },
      stack: error.stack,
      componentStack: errorInfo?.componentStack || undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId() || undefined,
      sessionId: this.sessionId,
      buildVersion: this.buildVersion,
    };
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | null {
    // Try to get user ID from various sources
    try {
      // Check auth context or global state
      if (window.localStorage.getItem("userId")) {
        return window.localStorage.getItem("userId")!;
      }
      // Check if there's a global user object
      if ((window as any).user?.id) {
        return (window as any).user.id;
      }
    } catch {
      // Ignore errors in getting user ID
    }
    return null;
  }

  private async sendToRemote(errorReport: ErrorReport): Promise<void> {
    if (!this.options.enableRemote || !this.options.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.options.remoteEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorReport),
      });
    } catch (error) {
      // Don't create infinite loop of errors
      console.error("Failed to send error report to remote:", error);
    }
  }

  private logToConsole(errorReport: ErrorReport): void {
    if (!this.options.enableConsole) {
      return;
    }

    const logMethod = this.options.environment === "development" 
      ? console.error 
      : console.warn;

    logMethod(`[${errorReport.severity.toUpperCase()}] ${errorReport.type}:`, {
      id: errorReport.id,
      message: errorReport.message,
      timestamp: errorReport.timestamp,
      component: errorReport.details?.componentStack?.split("\n")[1]?.trim(),
    });
  }

  private storeError(errorReport: ErrorReport): void {
    this.errors.push(errorReport);
    
    // Limit the number of stored errors
    if (this.errors.length > this.options.maxErrors) {
      this.errors = this.errors.slice(-this.options.maxErrors);
    }
  }

  private handleError(errorData: Partial<ErrorReport>): void {
    const error = new Error(errorData.message || "Unknown error");
    const errorReport = this.createErrorReport(
      error,
      errorData.details,
      errorData.type,
      errorData.severity
    );

    this.storeError(errorReport);
    this.logToConsole(errorReport);

    // Send to remote in production
    if (this.options.environment === "production") {
      this.sendToRemote(errorReport);
    }
  }

  /**
   * Handle component errors
   */
  public handleComponentError(error: Error, errorInfo: ErrorInfo, component?: string): void {
    this.handleError({
      type: "component",
      severity: "medium",
      message: `Component error${component ? ` in ${component}` : ""}`,
      details: {
        component,
        componentStack: errorInfo.componentStack,
      },
    });
  }

  /**
   * Handle network errors
   */
  public handleNetworkError(_error: Error, context?: string): void {
    this.handleError({
      type: "network",
      severity: "medium",
      message: `Network error${context ? ` in ${context}` : ""}`,
      details: {
        context,
        isOnline: navigator.onLine,
        connectionType: (navigator as any).connection?.effectiveType,
      },
    });
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(_error: Error, field?: string): void {
    this.handleError({
      type: "validation",
      severity: "low",
      message: `Validation error${field ? ` for ${field}` : ""}`,
      details: {
        field,
      },
    });
  }

  /**
   * Handle business logic errors
   */
  public handleBusinessError(_error: Error, operation?: string): void {
    this.handleError({
      type: "business",
      severity: "medium",
      message: `Business logic error${operation ? ` in ${operation}` : ""}`,
      details: {
        operation,
      },
    });
  }

  /**
   * Handle system errors
   */
  public handleSystemError(_error: Error, context?: string): void {
    this.handleError({
      type: "system",
      severity: "high",
      message: `System error${context ? ` in ${context}` : ""}`,
      details: {
        context,
      },
    });
  }

  /**
   * Get all stored errors
   */
  public getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  /**
   * Get errors by type
   */
  public getErrorsByType(type: ErrorReport["type"]): ErrorReport[] {
    return this.errors.filter(error => error.type === type);
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: ErrorReport["severity"]): ErrorReport[] {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Clear all stored errors
   */
  public clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  public getErrorStats() {
    const total = this.errors.length;
    const byType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byType,
      bySeverity,
      sessionId: this.sessionId,
      buildVersion: this.buildVersion,
    };
  }

  /**
   * Generate error report for support
   */
  public generateSupportReport(): string {
    const stats = this.getErrorStats();
    const recentErrors = this.errors.slice(-10);

    return `
Error Support Report
==================
Session ID: ${this.sessionId}
Build Version: ${this.buildVersion}
Environment: ${this.options.environment}
Generated: ${new Date().toISOString()}

Summary
-------
Total Errors: ${stats.total}
By Type: ${JSON.stringify(stats.byType, null, 2)}
By Severity: ${JSON.stringify(stats.bySeverity, null, 2)}

Recent Errors (Last 10)
-----------------------
${recentErrors.map(error => `
[${error.severity.toUpperCase()}] ${error.type}
Message: ${error.message}
Time: ${error.timestamp.toISOString()}
Component: ${error.details?.componentStack?.split("\n")[1]?.trim() || "N/A"}
Stack: ${error.stack?.split("\n")[1] || "N/A"}
---
`).join("\n")}
    `.trim();
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler({
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === "production",
  remoteEndpoint: process.env.REACT_APP_ERROR_ENDPOINT,
  environment: (process.env.NODE_ENV as any) || "development",
});

// Export convenience functions
export const handleComponentError = (error: Error, errorInfo: ErrorInfo, component?: string) =>
  errorHandler.handleComponentError(error, errorInfo, component);

export const handleNetworkError = (error: Error, context?: string) =>
  errorHandler.handleNetworkError(error, context);

export const handleValidationError = (error: Error, field?: string) =>
  errorHandler.handleValidationError(error, field);

export const handleBusinessError = (error: Error, operation?: string) =>
  errorHandler.handleBusinessError(error, operation);

export const handleSystemError = (error: Error, context?: string) =>
  errorHandler.handleSystemError(error, context);
