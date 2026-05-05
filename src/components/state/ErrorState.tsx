import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  ArrowLeft, 
  Bug,
  WifiOff,
  Database,
  ShieldCheck
} from "lucide-react";

interface ErrorStateProps {
  /** Type of error for appropriate icon and messaging */
  type?: "network" | "database" | "permission" | "not-found" | "server" | "custom";
  /** Custom icon to override default */
  icon?: ReactNode;
  /** Title of the error */
  title?: string;
  /** Error message */
  message?: string;
  /** Detailed error information (optional) */
  details?: string;
  /** Action button text */
  actionText?: string;
  /** Action button click handler */
  onAction?: () => void;
  /** Whether to show a retry button */
  showRetry?: boolean;
  /** Retry button click handler */
  onRetry?: () => void;
  /** Whether to show a back button */
  showBack?: boolean;
  /** Back button click handler */
  onBack?: () => void;
  /** Whether to show a home button */
  showHome?: boolean;
  /** Home button click handler */
  onHome?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Size of the error state */
  size?: "sm" | "md" | "lg";
  /** Error severity level */
  severity?: "low" | "medium" | "high" | "critical";
}

const errorTypes = {
  network: {
    title: "Koneksi Error",
    description: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
    icon: <WifiOff className="h-12 w-12 text-destructive" />
  },
  database: {
    title: "Database Error",
    description: "Terjadi kesalahan saat mengakses data. Silakan coba lagi.",
    icon: <Database className="h-12 w-12 text-destructive" />
  },
  permission: {
    title: "Akses Ditolak",
    description: "Anda tidak memiliki izin untuk mengakses halaman ini.",
    icon: <ShieldCheck className="h-12 w-12 text-destructive" />
  },
  "not-found": {
    title: "Data Tidak Ditemukan",
    description: "Data yang Anda cari tidak tersedia atau telah dihapus.",
    icon: <AlertTriangle className="h-12 w-12 text-muted-foreground" />
  },
  server: {
    title: "Server Error",
    description: "Terjadi kesalahan pada server. Silakan coba lagi nanti.",
    icon: <AlertTriangle className="h-12 w-12 text-destructive" />
  },
  custom: {
    title: "Error",
    description: "Terjadi kesalahan yang tidak terduga.",
    icon: <AlertTriangle className="h-12 w-12 text-destructive" />
  }
};

const sizeClasses = {
  sm: "p-4 text-center",
  md: "p-6 text-center", 
  lg: "p-8 text-center"
};

const severityColors = {
  low: "border-blue-200 bg-blue-50 text-blue-800",
  medium: "border-yellow-200 bg-yellow-50 text-yellow-800",
  high: "border-red-200 bg-red-50 text-red-800",
  critical: "border-red-300 bg-red-100 text-red-900"
};

export function ErrorState({
  type = "custom",
  icon,
  title,
  message,
  details,
  actionText,
  onAction,
  showRetry = true,
  onRetry,
  showBack = false,
  onBack,
  showHome = false,
  onHome,
  className,
  size = "md",
  severity = "medium"
}: ErrorStateProps) {
  const defaults = errorTypes[type];
  
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", sizeClasses[size], className)}>
      <div className="flex items-center justify-center">
        {icon || defaults.icon}
      </div>
      
      <div className="space-y-2 max-w-lg">
        <h3 className="text-lg font-semibold text-foreground">
          {title || defaults.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {message || defaults.description}
        </p>
        
        {details && (
          <div className="mt-3">
            <Alert className={severityColors[severity]}>
              <Bug className="h-4 w-4" />
              <AlertTitle>Detail Error</AlertTitle>
              <AlertDescription className="text-xs font-mono">
                {details}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {showRetry && onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        )}
        
        {actionText && onAction && (
          <Button onClick={onAction} variant="outline" className="gap-2">
            {actionText}
          </Button>
        )}
        
        {showBack && onBack && (
          <Button onClick={onBack} variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        )}
        
        {showHome && onHome && (
          <Button onClick={onHome} variant="ghost" className="gap-2">
            <Home className="h-4 w-4" />
            Beranda
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Full page error state
 */
export function FullPageErrorState({ 
  title,
  message,
  onRetry,
  onHome 
}: { 
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <ErrorState
        title={title}
        message={message}
        showRetry={!!onRetry}
        onRetry={onRetry}
        showHome={!!onHome}
        onHome={onHome}
        size="lg"
      />
    </div>
  );
}

/**
 * Card error state
 */
export function CardErrorState({ 
  message,
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-4 sm:p-5">
      <ErrorState
        type="server"
        message={message}
        showRetry={!!onRetry}
        onRetry={onRetry}
        size="sm"
      />
    </div>
  );
}

/**
 * Network error state
 */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      type="network"
      showRetry={!!onRetry}
      onRetry={onRetry}
      actionText="Periksa Koneksi"
      onAction={() => window.location.reload()}
    />
  );
}

/**
 * Permission error state
 */
export function PermissionErrorState({ onBack }: { onBack?: () => void }) {
  return (
    <ErrorState
      type="permission"
      showBack={!!onBack}
      onBack={onBack}
      showHome
      onHome={() => window.location.href = '/'}
    />
  );
}

/**
 * Not found error state
 */
export function NotFoundErrorState({ onBack }: { onBack?: () => void }) {
  return (
    <ErrorState
      type="not-found"
      showBack={!!onBack}
      onBack={onBack}
      showHome
      onHome={() => window.location.href = '/'}
    />
  );
}
