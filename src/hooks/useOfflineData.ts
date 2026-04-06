import { useState, useEffect, useCallback } from 'react';
import { setCachedData, getCachedData, isOnline, DEFAULT_TTL } from '@/lib/offlineCache';
import logger from '@/lib/logger';


interface UseOfflineDataOptions<T> {
  /** Unique cache key for this data */
  cacheKey: string;
  /** Function to fetch fresh data from the network */
  fetchFn: () => Promise<T>;
  /** Dependencies that trigger a refetch */
  dependencies?: any[];
  /** Whether to enable caching (default true) */
  enabled?: boolean;
  /** Maximum age in milliseconds before cache is considered expired */
  maxAgeMs?: number;
  /** Schema version for cache invalidation */
  version?: number;
}

interface UseOfflineDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isFromCache: boolean;
  isStale: boolean;
  isRefreshing: boolean;
  lastSynced: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that fetches data online and caches it via localStorage.
 * When offline, serves the last cached version with a timestamp.
 * Supports stale-while-revalidate: returns cached data immediately, then refreshes in background.
 */
export function useOfflineData<T>({
  cacheKey,
  fetchFn,
  dependencies = [],
  enabled = true,
  maxAgeMs = DEFAULT_TTL.ADMIN_TABLES,
  version = 1,
}: UseOfflineDataOptions<T>): UseOfflineDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!isBackgroundRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const online = await isOnline();

      // Try to serve from cache first (stale-while-revalidate)
      const cached = await getCachedData<T>(cacheKey, undefined, version);
      if (cached && !online) {
        // Offline: serve cache regardless of age
        setData(cached.data);
        setIsFromCache(true);
        setLastSynced(new Date(cached.timestamp));
        
        // Check if stale
        const age = Date.now() - cached.timestamp;
        setIsStale(age > maxAgeMs);
        setLoading(false);
        return;
      }

      if (online) {
        // If we have cached data, serve it immediately
        if (cached && isBackgroundRefresh) {
          setData(cached.data);
          setIsFromCache(true);
          setLastSynced(new Date(cached.timestamp));
          const age = Date.now() - cached.timestamp;
          setIsStale(age > maxAgeMs);
        }

        // Fetch fresh data in background
        const freshData = await fetchFn();
        setData(freshData);
        setIsFromCache(false);
        setIsStale(false);
        setLastSynced(new Date());

        // Cache it
        await setCachedData(cacheKey, freshData, version);
      } else {
        // Offline and no cache
        if (!cached) {
          setError(new Error('No cached data available offline'));
        }
      }
    } catch (err) {
      // Network fetch failed — try cache fallback
      const cached = await getCachedData<T>(cacheKey, undefined, version);
      if (cached) {
        setData(cached.data);
        setIsFromCache(true);
        setLastSynced(new Date(cached.timestamp));
        const age = Date.now() - cached.timestamp;
        setIsStale(age > maxAgeMs);
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [cacheKey, fetchFn, enabled, maxAgeMs, version]);

  // Fetch on mount + dependency changes
  useEffect(() => {
    fetchData();
  }, [...dependencies, fetchData]);

  // Auto-refetch when coming back online
  useEffect(() => {
    const handleOnline = () => {
      fetchData(true); // Background refresh
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isFromCache,
    isStale,
    isRefreshing,
    lastSynced,
    refetch: () => fetchData(false),
  };
}
