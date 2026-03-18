import { useState, useEffect, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { setCachedData, getCachedData, isOnline } from '@/lib/offlineCache';import logger from '@/lib/logger';


interface UseOfflineDataOptions<T> {
  /** Unique cache key for this data */
  cacheKey: string;
  /** Function to fetch fresh data from the network */
  fetchFn: () => Promise<T>;
  /** Dependencies that trigger a refetch */
  dependencies?: any[];
  /** Whether to enable caching (default true) */
  enabled?: boolean;
}

interface UseOfflineDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isFromCache: boolean;
  lastSynced: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that fetches data online and caches it via @capacitor/preferences.
 * When offline, serves the last cached version with a timestamp.
 */
export function useOfflineData<T>({
  cacheKey,
  fetchFn,
  dependencies = [],
  enabled = true,
}: UseOfflineDataOptions<T>): UseOfflineDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const online = await isOnline();

      if (online) {
        // Fetch fresh data
        const freshData = await fetchFn();
        setData(freshData);
        setIsFromCache(false);
        setLastSynced(new Date());

        // Cache it
        await setCachedData(cacheKey, freshData);
      } else {
        // Serve from cache
        const cached = await getCachedData<T>(cacheKey);
        if (cached) {
          setData(cached.data);
          setIsFromCache(true);
          setLastSynced(new Date(cached.timestamp));
        } else {
          setError(new Error('No cached data available offline'));
        }
      }
    } catch (err) {
      // Network fetch failed — try cache fallback
      const cached = await getCachedData<T>(cacheKey);
      if (cached) {
        setData(cached.data);
        setIsFromCache(true);
        setLastSynced(new Date(cached.timestamp));
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, enabled]);

  // Fetch on mount + dependency changes
  useEffect(() => {
    fetchData();
  }, [...dependencies, fetchData]);

  // Auto-refetch when coming back online
  useEffect(() => {
    const handler = Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        fetchData();
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isFromCache,
    lastSynced,
    refetch: fetchData,
  };
}
