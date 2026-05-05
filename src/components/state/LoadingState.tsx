import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Size of the loading indicator */
  size?: "sm" | "md" | "lg";
  /** Whether to show skeleton instead of spinner */
  skeleton?: boolean;
  /** Number of skeleton lines to show */
  skeletonLines?: number;
  /** Custom message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center the loading state */
  centered?: boolean;
}

export function LoadingState({ 
  size = "md", 
  skeleton = false, 
  skeletonLines = 3,
  message = "Memuat...",
  className,
  centered = false
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  const containerClasses = cn(
    "flex items-center gap-2 text-muted-foreground",
    centered && "justify-center min-h-[200px]",
    className
  );

  if (skeleton) {
    return (
      <div className={cn("space-y-2", centered && "flex flex-col items-center justify-center min-h-[200px]", className)}>
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-4 bg-muted rounded animate-pulse",
              i === skeletonLines - 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
        {message && (
          <div className="text-sm text-muted-foreground animate-pulse">{message}</div>
        )}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

/**
 * Full page loading state
 */
export function FullPageLoadingState({ message = "Memuat..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingState size="lg" message={message} />
    </div>
  );
}

/**
 * Card loading state
 */
export function CardLoadingState({ lines = 3 }: { lines?: number }) {
  return (
    <div className="p-4 sm:p-5 space-y-3">
      <LoadingState skeleton skeletonLines={lines} />
    </div>
  );
}

/**
 * Table loading state
 */
export function TableLoadingState({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 p-2">
          {Array.from({ length: columns }).map((_, j) => (
            <div 
              key={j}
              className="h-4 bg-muted rounded animate-pulse flex-1"
              style={{ animationDelay: `${(i * columns + j) * 100}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
