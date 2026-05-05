import { useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMonitoringRun,
  fetchMonitoringHourly,
  fetchMonitoringNg,
  fetchMonitoringDowntime,
  fetchMonitoringDowntimeRaw,
  fetchMonitoringCheckSheets,
  fetchMonitoringSkills,
  useMonitoringRealtime,
} from "@/hooks/useMonitoring";

// Cache configuration
const CACHE_CONFIG = {
  // Real-time data - short cache
  realtime: {
    staleTime: 1000 * 30, // 30 seconds
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60, // 1 minute
  },
  // Hourly data - medium cache
  hourly: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  },
  // Historical data - long cache
  historical: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: false as const, // Manual refetch only
  },
  // Skills data - very long cache
  skills: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60 * 4, // 4 hours
    refetchInterval: false as const, // Manual refetch only
  },
};

// Query keys for cache management
export const MONITORING_QUERY_KEYS = {
  run: (runId?: string) => ["monitoring", "run", runId] as const,
  hourly: (runId?: string) => ["monitoring", "hourly", runId] as const,
  ng: (runId?: string) => ["monitoring", "ng", runId] as const,
  downtime: (runId?: string) => ["monitoring", "downtime", runId] as const,
  downtimeRaw: (runId?: string) => ["monitoring", "downtimeRaw", runId] as const,
  checkSheets: (runId?: string) => ["monitoring", "checkSheets", runId] as const,
  skills: () => ["monitoring", "skills"] as const,
  realtime: (runId?: string) => ["monitoring", "realtime", runId] as const,
} as const;

// Enhanced monitoring hooks with caching
export const useCachedMonitoringRun = (runId?: string) => {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.run(runId),
    queryFn: fetchMonitoringRun,
    ...CACHE_CONFIG.realtime,
    enabled: !!runId,
  });
};

export const useCachedMonitoringHourly = (runId?: string) => {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.hourly(runId),
    queryFn: () => fetchMonitoringHourly(runId!),
    ...CACHE_CONFIG.hourly,
    enabled: !!runId,
  });
};

export const useCachedMonitoringNg = (runId?: string) => {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.ng(runId),
    queryFn: () => fetchMonitoringNg(runId!),
    ...CACHE_CONFIG.hourly,
    enabled: !!runId,
  });
};

export const useCachedMonitoringDowntime = (runId?: string) => {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.downtime(runId),
    queryFn: () => fetchMonitoringDowntime(runId!),
    ...CACHE_CONFIG.historical,
    enabled: !!runId,
  });
};

export const useCachedMonitoringDowntimeRaw = (runId?: string) => {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.downtimeRaw(runId),
    queryFn: () => fetchMonitoringDowntimeRaw(runId!),
    ...CACHE_CONFIG.historical,
    enabled: !!runId,
  });
};

export const useCachedMonitoringCheckSheets = (runId?: string) => {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.checkSheets(runId),
    queryFn: () => fetchMonitoringCheckSheets(runId!),
    ...CACHE_CONFIG.realtime,
    enabled: !!runId,
  });
};

export const useCachedMonitoringSkills = () => {
  return useQuery({
    queryKey: MONITORING_QUERY_KEYS.skills(),
    queryFn: fetchMonitoringSkills,
    ...CACHE_CONFIG.skills,
  });
};

export const useCachedMonitoringRealtime = (runId?: string) => {
  return useMonitoringRealtime(runId);
};

// Cache management utilities
export const useMonitoringCache = () => {
  const queryClient = useQueryClient();

  const invalidateRun = (runId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: MONITORING_QUERY_KEYS.run(runId),
    });
  };

  const invalidateHourly = (runId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: MONITORING_QUERY_KEYS.hourly(runId),
    });
  };

  const invalidateAllMonitoring = () => {
    return queryClient.invalidateQueries({
      queryKey: ["monitoring"],
    });
  };

  const prefetchMonitoringData = async (runId: string) => {
    // Prefetch all related data for a run
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: MONITORING_QUERY_KEYS.hourly(runId),
        queryFn: () => fetchMonitoringHourly(runId),
        ...CACHE_CONFIG.hourly,
      }),
      queryClient.prefetchQuery({
        queryKey: MONITORING_QUERY_KEYS.ng(runId),
        queryFn: () => fetchMonitoringNg(runId),
        ...CACHE_CONFIG.hourly,
      }),
      queryClient.prefetchQuery({
        queryKey: MONITORING_QUERY_KEYS.downtime(runId),
        queryFn: () => fetchMonitoringDowntime(runId),
        ...CACHE_CONFIG.historical,
      }),
      queryClient.prefetchQuery({
        queryKey: MONITORING_QUERY_KEYS.checkSheets(runId),
        queryFn: () => fetchMonitoringCheckSheets(runId),
        ...CACHE_CONFIG.realtime,
      }),
    ]);
  };

  const clearCache = () => {
    return queryClient.removeQueries({
      queryKey: ["monitoring"],
    });
  };

  const getCacheStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const monitoringQueries = queries.filter(query => 
      query.queryKey[0] === "monitoring"
    );

    return {
      totalQueries: monitoringQueries.length,
      activeQueries: monitoringQueries.filter(q => q.state.fetchStatus === "fetching").length,
      staleQueries: monitoringQueries.filter(q => q.isStale()).length,
      cacheSize: JSON.stringify(monitoringQueries.map(q => q.state.data)).length,
    };
  };

  return {
    invalidateRun,
    invalidateHourly,
    invalidateAllMonitoring,
    prefetchMonitoringData,
    clearCache,
    getCacheStats,
  };
};

// Background refresh mutation
export const useRefreshMonitoringData = () => {
  const queryClient = useQueryClient();
  const { invalidateAllMonitoring } = useMonitoringCache();

  return useMutation({
    mutationFn: async (runId: string) => {
      // Invalidate all monitoring queries for the run
      await invalidateAllMonitoring();
      
      // Refetch active run data
      return queryClient.refetchQueries({
        queryKey: MONITORING_QUERY_KEYS.run(runId),
      });
    },
    onSuccess: (_data, runId) => {
      console.log(`Successfully refreshed monitoring data for run: ${runId}`);
    },
    onError: (error, runId) => {
      console.error(`Failed to refresh monitoring data for run: ${runId}`, error);
    },
  });
};

// Offline support with stale-while-revalidate
export const useOfflineMonitoring = () => {
  const queryClient = useQueryClient();

  const getOfflineData = (queryKey: readonly unknown[]) => {
    const query = queryClient.getQueryData(queryKey);
    return query;
  };

  const setOfflineData = (queryKey: readonly unknown[], data: unknown) => {
    queryClient.setQueryData(queryKey, data);
  };

  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  // Listen for online/offline events
  const handleOnline = useCallback(() => {
    // Refetch all stale data when coming back online
    queryClient.refetchQueries({
      queryKey: ["monitoring"],
      stale: true,
    });
  }, [queryClient]);

  const handleOffline = useCallback(() => {
    // Mark all queries as stale when going offline
    queryClient.setQueriesData(
      { queryKey: ["monitoring"] },
      (oldData) => oldData,
      {
        updatedAt: Date.now(),
      }
    );
  }, [queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOffline, handleOnline]);

  return {
    getOfflineData,
    setOfflineData,
    isOnline,
  };
};

// Cache warming utility
export const useCacheWarming = () => {
  const { prefetchMonitoringData } = useMonitoringCache();

  const warmCache = async (runId: string) => {
    try {
      await prefetchMonitoringData(runId);
      console.log(`Cache warmed for run: ${runId}`);
    } catch (error) {
      console.error(`Failed to warm cache for run: ${runId}`, error);
    }
  };

  const warmAllCaches = async (runIds: string[]) => {
    await Promise.all(
      runIds.map(runId => warmCache(runId))
    );
  };

  return {
    warmCache,
    warmAllCaches,
  };
};
