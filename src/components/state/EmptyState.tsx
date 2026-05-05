import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Search, Inbox, FileText, Users } from "lucide-react";

interface EmptyStateProps {
  /** Type of empty state for appropriate icon and messaging */
  type?: "no-data" | "no-results" | "no-items" | "no-users" | "no-files" | "custom";
  /** Custom icon to override default */
  icon?: ReactNode;
  /** Title of the empty state */
  title?: string;
  /** Description message */
  description?: string;
  /** Action button text */
  actionText?: string;
  /** Action button click handler */
  onAction?: () => void;
  /** Whether to show a refresh button */
  showRefresh?: boolean;
  /** Refresh button click handler */
  onRefresh?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Size of the empty state */
  size?: "sm" | "md" | "lg";
}

const defaultMessages = {
  "no-data": {
    title: "Tidak ada data",
    description: "Belum ada data yang tersedia untuk ditampilkan.",
    icon: <Inbox className="h-12 w-12 text-muted-foreground" />
  },
  "no-results": {
    title: "Tidak ada hasil",
    description: "Pencarian tidak menemukan hasil. Coba ubah kata kunci atau filter.",
    icon: <Search className="h-12 w-12 text-muted-foreground" />
  },
  "no-items": {
    title: "Belum ada item",
    description: "Belum ada item yang ditambahkan. Mulai dengan menambah item pertama.",
    icon: <FileText className="h-12 w-12 text-muted-foreground" />
  },
  "no-users": {
    title: "Belum ada pengguna",
    description: "Belum ada pengguna yang terdaftar dalam sistem.",
    icon: <Users className="h-12 w-12 text-muted-foreground" />
  },
  "no-files": {
    title: "Belum ada file",
    description: "Belum ada file yang diunggah. Unggah file pertama untuk memulai.",
    icon: <FileText className="h-12 w-12 text-muted-foreground" />
  },
  "custom": {
    title: "Tidak ada data",
    description: "Tidak ada data yang tersedia.",
    icon: <Inbox className="h-12 w-12 text-muted-foreground" />
  }
};

const sizeClasses = {
  sm: "p-4 text-center",
  md: "p-6 text-center",
  lg: "p-8 text-center"
};

export function EmptyState({
  type = "no-data",
  icon,
  title,
  description,
  actionText,
  onAction,
  showRefresh = false,
  onRefresh,
  className,
  size = "md"
}: EmptyStateProps) {
  const defaults = defaultMessages[type];
  
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", sizeClasses[size], className)}>
      <div className="flex items-center justify-center">
        {icon || defaults.icon}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {title || defaults.title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {description || defaults.description}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {actionText && onAction && (
          <Button onClick={onAction} className="gap-2">
            <Plus className="h-4 w-4" />
            {actionText}
          </Button>
        )}
        
        {showRefresh && onRefresh && (
          <Button variant="outline" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state for data tables
 */
export function TableEmptyState({ 
  message = "Tidak ada data untuk ditampilkan",
  onRefresh 
}: { 
  message?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRefresh && (
        <Button variant="outline" onClick={onRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state for search results
 */
export function SearchEmptyState({ 
  query,
  onClear 
}: { 
  query?: string;
  onClear?: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-sm text-muted-foreground mb-2">
        Tidak ada hasil untuk "{query || 'pencarian Anda'}"
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Coba ubah kata kunci atau filter yang digunakan
      </p>
      {onClear && (
        <Button variant="outline" onClick={onClear} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Clear Search
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state for lists/cards
 */
export function ListEmptyState({ 
  message,
  actionText,
  onAction 
}: { 
  message?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <EmptyState
      type="no-items"
      title="Belum ada data"
      description={message || "Belum ada item yang tersedia. Mulai dengan menambah item pertama."}
      actionText={actionText}
      onAction={onAction}
    />
  );
}
