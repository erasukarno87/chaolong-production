/**
 * Shared UI state components.
 *
 * Provides consistent loading, empty, error, and skeleton states
 * across the entire application.
 *
 * Usage:
 *   import { PageLoading, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
 */

import { AlertTriangle, RefreshCw, Inbox, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

// ─── LoadingSpinner ───────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", label, className }: LoadingSpinnerProps) {
  const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className={cn("animate-spin shrink-0", sizeMap[size])} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

// ─── PageLoading ──────────────────────────────────────────────────────────────

interface PageLoadingProps {
  label?: string;
  className?: string;
}

export function PageLoading({ label = "Memuat…", className }: PageLoadingProps) {
  return (
    <div className={cn("flex min-h-[40vh] items-center justify-center", className)}>
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

// ─── InlineLoading ────────────────────────────────────────────────────────────

export function InlineLoading({ label = "Memuat…", className }: PageLoadingProps) {
  return (
    <div className={cn("flex items-center gap-2 py-4 px-2 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      {label}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 text-muted-foreground/40">{icon}</div>
      ) : (
        <Inbox className={cn("mb-3 text-muted-foreground/40", compact ? "h-8 w-8" : "h-12 w-12")} />
      )}
      <p className={cn("font-semibold text-foreground/80", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && (
        <p className={cn("mt-1 text-muted-foreground", compact ? "text-xs" : "text-sm")}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message,
  onRetry,
  retryLabel = "Coba Lagi",
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "py-12 px-6",
        className,
      )}
    >
      <div className={cn("mb-3 rounded-full bg-destructive/10 p-3", compact && "p-2 mb-2")}>
        <AlertTriangle className={cn("text-destructive", compact ? "h-5 w-5" : "h-8 w-8")} />
      </div>
      <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
      {message && (
        <p className={cn("mt-1 text-muted-foreground font-mono", compact ? "text-[11px]" : "text-xs")}>{message}</p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

// ─── OfflineState ─────────────────────────────────────────────────────────────

interface OfflineStateProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineState({ onRetry, className }: OfflineStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-6",
        className,
      )}
    >
      <div className="mb-3 rounded-full bg-amber-100 p-3">
        <WifiOff className="h-7 w-7 text-amber-600" />
      </div>
      <p className="font-semibold text-foreground">Koneksi Terputus</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Periksa koneksi internet Anda, lalu coba lagi.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, cols = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex gap-3 px-3 py-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 items-center border rounded-xl px-3 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4 rounded", c === 0 ? "w-16" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── CardSkeleton ─────────────────────────────────────────────────────────────

interface CardSkeletonProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export function CardSkeleton({ lines = 3, showAvatar = false, className }: CardSkeletonProps) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-xl shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
      {Array.from({ length: Math.max(0, lines - 2) }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full rounded" />
      ))}
    </div>
  );
}

// ─── StatCardSkeleton ─────────────────────────────────────────────────────────

export function StatCardSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", `grid-cols-2 sm:grid-cols-${Math.min(count, 4)}`, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-4 space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-2.5 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── SectionLoading — drop-in for SectionCard content ────────────────────────

export function SectionLoading({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      {label}
    </div>
  );
}
