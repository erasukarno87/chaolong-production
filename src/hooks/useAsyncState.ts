import { useState, useEffect, useCallback, useRef } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  isInitialLoad: boolean;
  lastUpdated: Date | null;
  retryCount: number;
}

export interface AsyncStateOptions {
  /** Whether to retry failed requests automatically */
  autoRetry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to cache successful responses */
  cache?: boolean;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
  /** Whether to show loading state on refetch */
  showLoadingOnRefetch?: boolean;
  /** Custom error messages */
  errorMessages?: {
    network?: string;
    timeout?: string;
    server?: string;
    default?: string;
  };
}

export interface UseAsyncStateReturn<T> extends AsyncState<T> {
  /** Execute the async operation */
  execute: (asyncFn: () => Promise<T>) => Promise<void>;
  /** Retry the last operation */
  retry: () => Promise<void>;
  /** Reset the state */
  reset: () => void;
  /** Refetch data (clear cache and execute) */
  refetch: () => Promise<void>;
  /** Set data manually */
  setData: (data: T) => void;
  /** Set error manually */
  setError: (error: string) => void;
  /** Clear error */
  clearError: () => void;
}

/**
 * Comprehensive async state management hook
 * Handles loading, error, empty, retry, and caching states
 */
export function useAsyncState<T>(
  options: AsyncStateOptions = {}
): UseAsyncStateReturn<T> {
  const {
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 1000,
    cache = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    showLoadingOnRefetch = true,
    errorMessages = {}
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    isEmpty: true,
    isInitialLoad: true,
    lastUpdated: null,
    retryCount: 0
  });

  const lastAsyncFnRef = useRef<(() => Promise<T>) | null>(null);
  const cacheDataRef = useRef<{ data: T; timestamp: number } | null>(null);

  const getErrorMessage = useCallback((error: unknown): string => {
    if (!error) return errorMessages.default || "Terjadi kesalahan yang tidak diketahui";
    
    if (error.name === 'TypeError' || error.message?.includes('fetch')) {
      return errorMessages.network || "Koneksi error. Periksa koneksi internet Anda.";
    }
    
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return errorMessages.timeout || "Request timeout. Silakan coba lagi.";
    }
    
    if (error.status >= 500) {
      return errorMessages.server || "Server error. Silakan coba lagi nanti.";
    }
    
    if (error.message) {
      return error.message;
    }
    
    return errorMessages.default || "Terjadi kesalahan yang tidak diketahui";

  }, [errorMessages]);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    lastAsyncFnRef.current = asyncFn;

    // Check cache first
    if (cache && cacheDataRef.current) {
      const { data, timestamp } = cacheDataRef.current;
      const now = Date.now();
      
      if (now - timestamp < cacheDuration) {
        setState(prev => ({
          ...prev,
          data,
          loading: false,
          error: null,
          isEmpty: false,
          isInitialLoad: false,
          lastUpdated: new Date(timestamp)
        }));
        return;
      }
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      isInitialLoad: prev.isInitialLoad && prev.data === null
    }));

    try {
      const result = await asyncFn();
      
      // Update cache
      if (cache) {
        cacheDataRef.current = {
          data: result,
          timestamp: Date.now()
        };
      }

      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        isEmpty: !result || (Array.isArray(result) && result.length === 0),
        isInitialLoad: false,
        lastUpdated: new Date(),
        retryCount: 0
      }));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isEmpty: true,
        isInitialLoad: false,
        retryCount: prev.retryCount + 1
      }));

      // Auto retry if enabled and within limits
      if (autoRetry && state.retryCount < maxRetries) {
          retry();
        }, retryDelay * Math.pow(2, state.retryCount)); // Exponential backoff
      }
    }
  }, [cache, cacheDuration, autoRetry, maxRetries, retryDelay, state.retryCount, getErrorMessage]);

    if (lastAsyncFnRef.current) {
      await execute(lastAsyncFnRef.current);
    }
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isEmpty: true,
      isInitialLoad: true,
      lastUpdated: null,
      retryCount: 0
    });
    cacheDataRef.current = null;
    lastAsyncFnRef.current = null;
  }, []);

  const refetch = useCallback(async () => {
    cacheDataRef.current = null;
    if (lastAsyncFnRef.current) {
      if (showLoadingOnRefetch) {
        await execute(lastAsyncFnRef.current);
      } else {
        // Execute without showing loading state
        setState(prev => ({ ...prev, loading: false }));
        await execute(lastAsyncFnRef.current);
      }
    }
  }, [execute, showLoadingOnRefetch]);

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      loading: false,
      error: null,
      isEmpty: !data || (Array.isArray(data) && data.length === 0),
      isInitialLoad: false,
      lastUpdated: new Date()
    }));
    
    if (cache) {
      cacheDataRef.current = {
        data,
        timestamp: Date.now()
      };
    }
  }, [cache]);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      loading: false,
      error,
      isEmpty: true,
      isInitialLoad: false
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset,
    refetch,
    setData,
    setError,
    clearError
  };
}

/**
 * Hook for paginated async data
 */
export function usePaginatedAsyncState<T>(
  options: AsyncStateOptions & {
    pageSize?: number;
    initialPage?: number;
  } = {}
) {
  const { pageSize = 20, initialPage = 1, ...asyncOptions } = options;
  
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const lastFetchFnRef = useRef<((page: number, pageSize: number) => Promise<{
    items: T[];
    pagination: {
      page: number;
      totalPages: number;
      totalItems: number;
      pageSize: number;
    };
  }>) | null>(null);
  
  const asyncState = useAsyncState<{
    items: T[];
    pagination: {
      page: number;
      totalPages: number;
      totalItems: number;
      pageSize: number;
    };
  }>(asyncOptions);

  const loadPage = useCallback(async (newPage: number, fetchFn: (page: number, pageSize: number) => Promise<{
    items: T[];
    pagination: {
      page: number;
      totalPages: number;
      totalItems: number;
      pageSize: number;
    };
  }>) => {
    setPage(newPage);
    lastFetchFnRef.current = fetchFn;
    
    await asyncState.execute(async () => {
      const result = await fetchFn(newPage, pageSize);
      setTotalPages(result.pagination.totalPages);
      setTotalItems(result.pagination.totalItems);
      return result;
    });
  }, [asyncState, pageSize]);

  const nextPage = useCallback(() => {
    if (page < totalPages && lastFetchFnRef.current) {
      loadPage(page + 1, lastFetchFnRef.current);
    }
  }, [page, totalPages, loadPage]);

  const prevPage = useCallback(() => {
    if (page > 1 && lastFetchFnRef.current) {
      loadPage(page - 1, lastFetchFnRef.current);
    }
  }, [page, loadPage]);

  const goToPage = useCallback((targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages && lastFetchFnRef.current) {
      loadPage(targetPage, lastFetchFnRef.current);
    }
  }, [loadPage, totalPages]);

  return {
    ...asyncState,
    page,
    totalPages,
    totalItems,
    pageSize,
    loadPage,
    nextPage,
    prevPage,
    goToPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

/**
 * Hook for real-time data with WebSocket/SSE
 */
export function useRealtimeAsyncState<T>(
  connectFn: () => Promise<{
    data: T;
    subscribe: (callback: (data: T) => void) => () => void;
  }>,
  options: AsyncStateOptions & {
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  } = {}
) {
  const { reconnectInterval = 5000, maxReconnectAttempts = 10, errorMessages, ...asyncOptions } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const asyncState = useAsyncState<T>(asyncOptions);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getErrorMessage = (error: any): string => {
    if (!error) return errorMessages?.default || "Terjadi kesalahan yang tidak diketahui";
    
    if (error.name === 'TypeError' || error.message?.includes('fetch')) {
      return errorMessages?.network || "Koneksi error. Periksa koneksi internet Anda.";
    }
    
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return errorMessages?.timeout || "Request timeout. Silakan coba lagi.";
    }
    
    if (error.status >= 500) {
      return errorMessages?.server || "Server error. Silakan coba lagi nanti.";
    }
    
    if (error.message) {
      return error.message;
    }
    
    return errorMessages?.default || "Terjadi kesalahan yang tidak diketahui";
  };

  const connect = useCallback(async () => {
    try {
      const connection = await connectFn();
      
      // Set initial data
      asyncState.setData(connection.data);
      setIsConnected(true);
      setReconnectAttempts(0);
      
      // Subscribe to updates
      unsubscribeRef.current = connection.subscribe((data) => {
        asyncState.setData(data);
      });
      
    } catch (error) {
      setIsConnected(false);
      asyncState.setError(getErrorMessage(error));
      
      // Auto reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, reconnectInterval);
      }
    }
  }, [connectFn, reconnectAttempts, maxReconnectAttempts, reconnectInterval, asyncState, getErrorMessage]);

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...asyncState,
    isConnected,
    reconnectAttempts,
    connect,
    disconnect
  };
}
