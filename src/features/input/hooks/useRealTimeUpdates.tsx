/**
 * Real-time Updates Hook
 * WebSocket integration untuk live production setup updates
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  REALTIME_RECONNECT_ATTEMPTS,
  REALTIME_RECONNECT_DELAY_MS,
  REALTIME_HEARTBEAT_INTERVAL_MS,
  REALTIME_MAX_UPDATES,
  REALTIME_MAX_ALERTS
} from "../constants";

// Types untuk real-time updates
interface RealtimeUpdate {
  id: string;
  type: 'operator_status' | 'skill_compliance' | 'workstation_status' | 'system_alert';
  timestamp: string;
  data: any;
  userId?: string;
  workstationId?: string;
  operatorId?: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  requiresAction?: boolean;
  actionUrl?: string;
}

interface UseRealTimeUpdatesOptions {
  workspaceId?: string;
  lineId?: string;
  enableNotifications?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseRealTimeUpdatesReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastUpdate: RealtimeUpdate | null;
  systemAlerts: SystemAlert[];
  recentUpdates: RealtimeUpdate[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  manualRefresh: () => void;
  clearAlerts: () => void;
  markAlertAsRead: (alertId: string) => void;
}

/**
 * Main Real-time Updates Hook
 */
export function useRealTimeUpdates({
  workspaceId,
  lineId,
  enableNotifications = true,
  reconnectAttempts = REALTIME_RECONNECT_ATTEMPTS,
  reconnectDelay = REALTIME_RECONNECT_DELAY_MS
}: UseRealTimeUpdatesOptions = {}): UseRealTimeUpdatesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<RealtimeUpdate[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket URL construction
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/production-updates`;
    
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (lineId) params.append('lineId', lineId);
    
    return `${wsUrl}?${params.toString()}`;
  }, [workspaceId, lineId]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'update': {
                  const update: RealtimeUpdate = message.data;
                  setLastUpdate(update);
                  setRecentUpdates(prev => [update, ...prev.slice(0, REALTIME_MAX_UPDATES - 1)]);

                  // Show notification for important updates
                  if (enableNotifications) {
                    handleUpdateNotification(update);
                  }
                  break;
                }

                case 'alert': {
                  const alert: SystemAlert = message.data;
                  setSystemAlerts(prev => [alert, ...prev.slice(0, REALTIME_MAX_ALERTS - 1)]);
          
          if (enableNotifications) {
            handleAlertNotification(alert);
          }
          break;
        }
          
        case 'heartbeat':
          // Respond to server heartbeat
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'heartbeat_response' }));
          }
          break;
          
        case 'ping':
          // Respond to ping
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'pong' }));
          }
          break;
          
        default:
          // Unknown message type - silently ignore in production
          break;
      }
    } catch {
      // Silently ignore parse errors - malformed messages shouldn't crash the app
    }
  }, [enableNotifications]);

  // Handle update notifications
  const handleUpdateNotification = useCallback((update: RealtimeUpdate) => {
    let title = '';
    let message = '';
    
    switch (update.type) {
      case 'operator_status':
        title = 'Operator Status Updated';
        message = `Operator status has been updated`;
        break;
      case 'skill_compliance':
        title = 'Skill Compliance Updated';
        message = `Skill compliance status has changed`;
        break;
      case 'workstation_status':
        title = 'Workstation Status Updated';
        message = `Workstation status has been updated`;
        break;
      default:
        title = 'Production Update';
        message = 'New update received';
    }
    
    toast.info(message, {
      description: new Date(update.timestamp).toLocaleTimeString('id-ID'),
      action: enableNotifications ? {
        label: 'View Details',
        onClick: () => {
          // Navigate to update details or show modal
        }
      } : undefined
    });
  }, []);

  // Handle alert notifications
  const handleAlertNotification = useCallback((alert: SystemAlert) => {
    const toastFn = alert.type === 'error' ? toast.error :
                     alert.type === 'warning' ? toast.warning :
                     alert.type === 'success' ? toast.success : toast.info;
    
    toastFn(alert.message, {
      description: alert.title,
      duration: alert.type === 'error' ? 10000 : 5000,
      action: alert.requiresAction ? {
        label: 'Take Action',
        onClick: () => {
          if (alert.actionUrl) {
            window.location.href = alert.actionUrl;
          }
        }
      } : undefined
    });
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, REALTIME_HEARTBEAT_INTERVAL_MS);
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
        
        toast.success('Real-time updates connected', {
          description: 'You will receive live updates now'
        });
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('disconnected');
        stopHeartbeat();

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttemptsRef.current);
        } else if (reconnectAttemptsRef.current >= reconnectAttempts) {
          setConnectionStatus('error');
          toast.error('Connection lost', {
            description: 'Unable to reconnect to real-time updates'
          });
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        toast.error('Connection error', {
          description: 'Failed to establish real-time connection'
        });
      };

    } catch {
      setIsConnecting(false);
      setConnectionStatus('error');
    }
  }, [getWebSocketUrl, handleWebSocketMessage, startHeartbeat, stopHeartbeat, reconnectAttempts, reconnectDelay]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus('disconnected');
  }, [stopHeartbeat]);

  // Manual refresh
  const manualRefresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'refresh_request' }));
    } else {
      connect();
    }
  }, [connect]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setSystemAlerts([]);
  }, []);

  // Mark alert as read
  const markAlertAsRead = useCallback((alertId: string) => {
    setSystemAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Initialize connection
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    isConnected,
    isConnecting,
    lastUpdate,
    systemAlerts,
    recentUpdates,
    connectionStatus,
    manualRefresh,
    clearAlerts,
    markAlertAsRead
  };
}

/**
 * Real-time Updates Status Component
 */
export function RealTimeStatus({ 
  isConnected, 
  connectionStatus, 
  lastUpdate,
  onManualRefresh 
}: {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUpdate: RealtimeUpdate | null;
  onManualRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Connection Status Indicator */}
      <div className="flex items-center gap-1">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500 animate-pulse" :
          connectionStatus === 'connecting' ? "bg-amber-500 animate-pulse" :
          connectionStatus === 'error' ? "bg-red-500" : "bg-gray-400"
        )} />
        <span className={cn(
          "font-medium",
          isConnected ? "text-green-600" :
          connectionStatus === 'connecting' ? "text-amber-600" :
          connectionStatus === 'error' ? "text-red-600" : "text-gray-600"
        )}>
          {isConnected ? 'Live' :
           connectionStatus === 'connecting' ? 'Connecting...' :
           connectionStatus === 'error' ? 'Error' : 'Offline'}
        </span>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <span className="text-gray-500">
          Last: {new Date(lastUpdate.timestamp).toLocaleTimeString('id-ID')}
        </span>
      )}

      {/* Manual Refresh Button */}
      <button
        onClick={onManualRefresh}
        className="text-blue-600 hover:text-blue-700 transition-colors"
        title="Manual refresh"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}

/**
 * System Alerts Component
 */
export function SystemAlerts({ 
  alerts, 
  onClearAlerts, 
  onMarkAsRead 
}: {
  alerts: SystemAlert[];
  onClearAlerts: () => void;
  onMarkAsRead: (alertId: string) => void;
}) {
  if (alerts.length === 0) return null;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50 text-blue-700';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">System Alerts</h4>
        <button
          onClick={onClearAlerts}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear All
        </button>
      </div>
      
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={cn(
            "p-3 rounded-lg border shadow-sm transition-all duration-200",
            getAlertColor(alert.type)
          )}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{getAlertIcon(alert.type)}</span>
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-sm">{alert.title}</h5>
              <p className="text-xs mt-1">{alert.message}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs opacity-75">
                  {new Date(alert.timestamp).toLocaleTimeString('id-ID')}
                </span>
                <button
                  onClick={() => onMarkAsRead(alert.id)}
                  className="text-xs opacity-75 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Recent Updates Feed Component
 */
export function RecentUpdatesFeed({ 
  updates, 
  maxItems = 5 
}: { 
  updates: RealtimeUpdate[]; 
  maxItems?: number;
}) {
  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'operator_status':
        return '👤';
      case 'skill_compliance':
        return '🛡️';
      case 'workstation_status':
        return '🏭';
      case 'system_alert':
        return '🔔';
      default:
        return '📡';
    }
  };

  const getUpdateColor = (type: string) => {
    switch (type) {
      case 'operator_status':
        return 'text-blue-600';
      case 'skill_compliance':
        return 'text-emerald-600';
      case 'workstation_status':
        return 'text-purple-600';
      case 'system_alert':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  if (updates.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <div className="text-2xl mb-2">📡</div>
        <p className="text-sm">No recent updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900">Recent Updates</h4>
      {updates.slice(0, maxItems).map(update => (
        <div key={update.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
          <span className="text-lg">{getUpdateIcon(update.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">
              {update.type.replace('_', ' ').charAt(0).toUpperCase() + update.type.replace('_', ' ').slice(1)}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(update.timestamp).toLocaleTimeString('id-ID')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
