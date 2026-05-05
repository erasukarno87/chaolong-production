import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const enhancedCardVariants = cva(
  "rounded-xl border shadow-card-md transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground shadow-card-md hover:shadow-card-lg",
        surface: "bg-surface text-foreground border-border",
        muted: "bg-muted text-muted-foreground",
        gradient: "bg-gradient-to-br from-primary to-primary-deep text-primary-foreground border-transparent",
        glass: "bg-white/10 backdrop-blur-md border-white/20 text-white",
        elevated: "bg-card text-card-foreground shadow-card-lg hover:shadow-card-xl",
        outlined: "bg-transparent border-2 border-border hover:bg-muted/50",
      },
      size: {
        sm: "p-3 sm:p-4",
        md: "p-4 sm:p-5", 
        lg: "p-5 sm:p-6",
        xl: "p-6 sm:p-8",
      },
      density: {
        compact: "p-2 sm:p-3",
        comfortable: "p-4 sm:p-5",
        spacious: "p-6 sm:p-8",
      },
      interactive: {
        true: "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      density: "comfortable",
      interactive: false,
    },
  }
);

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Whether to show a loading skeleton */
  loading?: boolean;
  /** Whether the card is in an error state */
  error?: boolean;
}

export const EnhancedCard = forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, size, density, interactive, header, footer, loading, error, children, ...props }, ref) => {
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(enhancedCardVariants({ variant, size, density, interactive }), className)}
          {...props}
        >
          {header && (
            <div className="mb-4">
              <div className="h-6 bg-muted rounded animate-pulse" />
            </div>
          )}
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
          {footer && (
            <div className="mt-4">
              <div className="h-8 bg-muted rounded animate-pulse" />
            </div>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div
          ref={ref}
          className={cn(enhancedCardVariants({ variant: "outlined", size, density, interactive }), "border-destructive/50 bg-destructive/5", className)}
          {...props}
        >
          <div className="text-center text-destructive">
            <div className="text-sm font-medium">Error</div>
            <div className="text-xs text-muted-foreground mt-1">Unable to load content</div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(enhancedCardVariants({ variant, size, density, interactive }), className)}
        {...props}
      >
        {header && (
          <div className={cn("mb-4", size === "sm" && "mb-3", size === "lg" && "mb-5", size === "xl" && "mb-6")}>
            {header}
          </div>
        )}
        
        <div className="space-y-4">
          {children}
        </div>
        
        {footer && (
          <div className={cn("mt-4 pt-4 border-t", size === "sm" && "mt-3 pt-3", size === "lg" && "mt-5 pt-5", size === "xl" && "mt-6 pt-6")}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

EnhancedCard.displayName = "EnhancedCard";

/**
 * Metric card for displaying key performance indicators
 */
export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  variant = "default", 
  size = "md" 
}: MetricCardProps) {
  const variantClasses = {
    default: "border-blue-100 bg-blue-50/70 text-blue-600",
    success: "border-emerald-100 bg-emerald-50/70 text-emerald-600",
    warning: "border-amber-100 bg-amber-50/70 text-amber-600",
    danger: "border-red-100 bg-red-50/70 text-red-600",
  };

  const trendIcons = {
    up: "↗",
    down: "↘", 
    neutral: "→",
  };

  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-600",
    neutral: "text-muted-foreground",
  };

  return (
    <EnhancedCard 
      variant="surface" 
      size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"}
      className={variantClasses[variant]}
    >
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
          {title}
        </div>
        <div className={`font-bold font-mono tracking-tight ${
          size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl"
        }`}>
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{subtitle}</span>
            {trend && (
              <span className={cn("font-mono font-semibold", trendColors[trend])}>
                {trendIcons[trend]} {trendValue}
              </span>
            )}
          </div>
        )}
      </div>
    </EnhancedCard>
  );
}

/**
 * Status card for displaying system status
 */
export interface StatusCardProps {
  title: string;
  status: "online" | "offline" | "warning" | "error";
  description?: string;
  lastUpdated?: string;
  actions?: React.ReactNode;
}

export function StatusCard({ title, status, description, lastUpdated, actions }: StatusCardProps) {
  const statusConfig = {
    online: { color: "success", icon: "●", label: "Online" },
    offline: { color: "danger", icon: "●", label: "Offline" },
    warning: { color: "warning", icon: "●", label: "Warning" },
    error: { color: "danger", icon: "●", label: "Error" },
  };

  const config = statusConfig[status];

  return (
    <EnhancedCard variant="surface" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-muted/20 rounded-bl-full" />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-${config.color === "success" ? "emerald" : config.color === "danger" ? "red" : "amber"}-500`}>
                {config.icon}
              </span>
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </EnhancedCard>
  );
}

/**
 * Progress card for displaying progress information
 */
export interface ProgressCardProps {
  title: string;
  value: number;
  max: number;
  label?: string;
  color?: "primary" | "success" | "warning" | "danger";
  showPercentage?: boolean;
}

export function ProgressCard({ 
  title, 
  value, 
  max, 
  label, 
  color = "primary", 
  showPercentage = true 
}: ProgressCardProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colorClasses = {
    primary: "bg-gradient-to-r from-[#1A6EFA] to-[#60A5FA]",
    success: "bg-gradient-to-r from-[#00B37D] to-[#34D399]",
    warning: "bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]",
    danger: "bg-gradient-to-r from-[#EF4444] to-[#FC8181]",
  };

  return (
    <EnhancedCard variant="surface">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {showPercentage && (
            <span className="text-sm font-mono font-bold text-foreground">
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${colorClasses[color]}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{label || "Progress"}</span>
            <span className="font-mono">
              {value.toLocaleString()} / {max.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </EnhancedCard>
  );
}
