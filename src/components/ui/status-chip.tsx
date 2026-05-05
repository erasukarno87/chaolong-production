import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        success: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        warning: "bg-amber-100 text-amber-700 border border-amber-200", 
        danger: "bg-red-100 text-red-700 border border-red-200",
        info: "bg-blue-100 text-blue-700 border border-blue-200",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-input bg-background text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[9px]",
        md: "px-2.5 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-[11px]",
      },
      animated: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      animated: false,
    },
  }
);

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusChipVariants> {
  /** Whether to show a dot indicator */
  showDot?: boolean;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Whether the chip is in a loading state */
  loading?: boolean;
}

export function StatusChip({ 
  className, 
  variant, 
  size, 
  animated,
  showDot = false,
  icon,
  loading = false,
  children,
  ...props 
}: StatusChipProps) {
  const dotVariants = {
    default: "bg-muted-foreground",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500", 
    info: "bg-blue-500",
    primary: "bg-primary",
    secondary: "bg-secondary-foreground",
    outline: "bg-foreground",
  };

  return (
    <div
      className={cn(statusChipVariants({ variant, size, animated }), className)}
      {...props}
    >
      {loading && (
        <div className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      
      {!loading && showDot && (
        <div className={cn("h-2 w-2 rounded-full", dotVariants[variant!])} />
      )}
      
      {!loading && icon && (
        <span className="h-3 w-3 flex items-center justify-center">
          {icon}
        </span>
      )}
      
      <span>{children}</span>
    </div>
  );
}

/**
 * Live status chip with animated dot
 */
export function LiveStatusChip({ isLive = false, children }: { 
  isLive?: boolean; 
  children: React.ReactNode;
}) {
  return (
    <StatusChip 
      variant={isLive ? "success" : "warning"} 
      showDot 
      animated={isLive}
    >
      {children}
    </StatusChip>
  );
}

/**
 * Connection status chip
 */
export function ConnectionStatusChip({ status }: { status: "online" | "offline" | "slow" }) {
  const variants = {
    online: "success" as const,
    offline: "danger" as const,
    slow: "warning" as const,
  };

  return (
    <StatusChip variant={variants[status]} showDot>
      {status === "online" ? "Online" : status === "offline" ? "Offline" : "Slow"}
    </StatusChip>
  );
}

/**
 * Permission level chip
 */
export function PermissionChip({ level }: { level: "admin" | "user" | "guest" }) {
  const variants = {
    admin: "danger" as const,
    user: "primary" as const,
    guest: "secondary" as const,
  };

  return (
    <StatusChip variant={variants[level]}>
      {level.toUpperCase()}
    </StatusChip>
  );
}
