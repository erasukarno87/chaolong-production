import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OfflineIndicatorProps {
  /** Position of the indicator */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Whether to show detailed status */
  detailed?: boolean;
  /** Custom class names */
  className?: string;
  /** Callback when connection is restored */
  onConnectionRestored?: () => void;
  /** Callback when connection is lost */
  onConnectionLost?: () => void;
}

interface ConnectionState {
  isOnline: boolean;
  isSlow: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  connectionType: string;
}

export function OfflineIndicator({ 
  position = "top-right",
  detailed = false,
  className,
  onConnectionRestored,
  onConnectionLost
}: OfflineIndicatorProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: navigator.onLine,
    isSlow: false,
    lastConnected: null,
    reconnectAttempts: 0,
    connectionType: 'unknown'
  });
  const [isReconnecting, setIsReconnecting] = useState(false);

  const positionClasses = {
    "top-right": "fixed top-4 right-4 z-50",
    "top-left": "fixed top-4 left-4 z-50", 
    "bottom-right": "fixed bottom-4 right-4 z-50",
    "bottom-left": "fixed bottom-4 left-4 z-50"
  };

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState(prev => ({
        ...prev,
        isOnline: true,
        lastConnected: new Date(),
        reconnectAttempts: 0
      }));
      
      toast.success("Koneksi terhubung kembali");
      onConnectionRestored?.();
    };

    const handleOffline = () => {
      setConnectionState(prev => ({
        ...prev,
        isOnline: false,
        lastConnected: new Date()
      }));
      
      toast.error("Koneksi terputus");
      onConnectionLost?.();
    };

    const checkConnectionSpeed = async () => {
      if (!navigator.onLine) return;
      
      try {
        const start = performance.now();
        await fetch('/api/health', { method: 'HEAD' });
        const duration = performance.now() - start;
        
        setConnectionState(prev => ({
          ...prev,
          isSlow: duration > 3000, // Consider slow if > 3 seconds
          connectionType: (navigator as any).connection ? (navigator as any).connection.effectiveType || 'unknown' : 'unknown'
        }));
      } catch {
        setConnectionState(prev => ({
          ...prev,
          isSlow: true
        }));
      }
    };

    // Initial check
    checkConnectionSpeed();

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection speed check
    const speedCheckInterval = setInterval(checkConnectionSpeed, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(speedCheckInterval);
    };
  }, [onConnectionRestored, onConnectionLost]);

  // Auto-reconnect logic
  useEffect(() => {
    if (!connectionState.isOnline && connectionState.reconnectAttempts < 5) {
      const timeout = setTimeout(() => {
        setIsReconnecting(true);
        
        // Try to reconnect
        if (navigator.onLine) {
          fetch('/api/health', { method: 'HEAD' })
            .then(() => {
              setConnectionState(prev => ({
                ...prev,
                isOnline: true,
                lastConnected: new Date(),
                reconnectAttempts: 0
              }));
            })
            .catch(() => {
              setConnectionState(prev => ({
                ...prev,
                reconnectAttempts: prev.reconnectAttempts + 1
              }));
            })
            .finally(() => {
              setIsReconnecting(false);
            });
        }
      }, Math.pow(2, connectionState.reconnectAttempts) * 1000); // Exponential backoff

      return () => clearTimeout(timeout);
    }
  }, [connectionState.isOnline, connectionState.reconnectAttempts]);

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    
    try {
      await fetch('/api/health', { method: 'HEAD' });
      setConnectionState(prev => ({
        ...prev,
        isOnline: true,
        lastConnected: new Date(),
        reconnectAttempts: 0
      }));
      toast.success("Koneksi berhasil dipulihkan");
    } catch {
      setConnectionState(prev => ({
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      toast.error("Gagal terhubung ke server");
    } finally {
      setIsReconnecting(false);
    }
  };

  const formatLastConnected = (date: Date | null) => {
    if (!date) return "Tidak pernah terhubung";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  if (connectionState.isOnline && !connectionState.isSlow && !detailed) {
    return null; // Don't show indicator when everything is fine
  }

  return (
    <div className={cn(
      "bg-card border rounded-lg shadow-lg p-3 max-w-sm",
      positionClasses[position],
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {connectionState.isOnline ? (
            connectionState.isSlow ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <Wifi className="h-5 w-5 text-green-500" />
            )
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {connectionState.isOnline ? (
                connectionState.isSlow ? "Koneksi Lambat" : "Tersambung"
              ) : "Offline"}
            </span>
            
            {detailed && (
              <span className="text-xs text-muted-foreground">
                {connectionState.connectionType} • 
                Terakhir: {formatLastConnected(connectionState.lastConnected)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {connectionState.isSlow && (
            <Badge variant="secondary" className="text-xs">
              Lambat
            </Badge>
          )}
          
          {!connectionState.isOnline && (
            <Button
              size="sm"
              onClick={handleManualReconnect}
              disabled={isReconnecting}
              className="gap-1"
            >
              {isReconnecting ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {isReconnecting ? "Menghubungkan..." : "Hubungkan"}
            </Button>
          )}
        </div>
      </div>

      {detailed && !connectionState.isOnline && connectionState.reconnectAttempts > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Percobaan ke-{connectionState.reconnectAttempts} dari 5
        </div>
      )}
    </div>
  );
}

/**
 * Hook for connection status monitoring
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isSlow = false;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlow };
}

/**
 * Simple connection status badge
 */
export function ConnectionStatusBadge() {
  const { isOnline, isSlow } = useConnectionStatus();

  if (!isOnline) {
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  }

  if (isSlow) {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Lambat
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="gap-1 bg-green-100 text-green-800">
      <Wifi className="h-3 w-3" />
      Online
    </Badge>
  );
}
