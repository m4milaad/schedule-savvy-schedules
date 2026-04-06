const CACHE_PREFIX = 'cuk_cache_';
const SYNC_TIMESTAMP_KEY = 'cuk_last_sync_timestamp';

interface CachedData<T> {
  data: T;
  timestamp: number;
  version?: number; // Schema version for cache invalidation
}

// Default TTL values (in milliseconds)
export const DEFAULT_TTL = {
  SCHEDULE: 6 * 60 * 60 * 1000, // 6 hours
  USER_PROFILE: 24 * 60 * 60 * 1000, // 24 hours
  SEAT_ASSIGNMENT: 15 * 60 * 1000, // 15 minutes
  ADMIN_TABLES: 5 * 60 * 1000, // 5 minutes (departments, venues, etc.)
  REALTIME: 60 * 1000, // 1 minute (frequently changing data)
} as const;

/**
 * Save data to localStorage cache
 */
export async function setCachedData<T>(key: string, data: T, version = 1): Promise<void> {
  const cached: CachedData<T> = {
    data,
    timestamp: Date.now(),
    version,
  };
  localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
  // Update global last-synced timestamp
  localStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
}

/**
 * Get cached data from localStorage with TTL enforcement
 * @param key Cache key
 * @param maxAgeMs Maximum age in milliseconds (optional). If provided, returns null if expired.
 * @param expectedVersion Expected schema version (optional). If provided, returns null if version mismatch.
 */
export async function getCachedData<T>(
  key: string,
  maxAgeMs?: number,
  expectedVersion?: number
): Promise<CachedData<T> | null> {
  const value = localStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (!value) return null;
  
  try {
    const cached = JSON.parse(value) as CachedData<T>;
    
    // Check version mismatch
    if (expectedVersion !== undefined && cached.version !== expectedVersion) {
      return null;
    }
    
    // Check TTL expiration
    if (maxAgeMs !== undefined) {
      const age = Date.now() - cached.timestamp;
      if (age > maxAgeMs) {
        return null; // Expired
      }
    }
    
    return cached;
  } catch {
    return null;
  }
}

/**
 * Remove a specific cache entry
 */
export async function removeCachedData(key: string): Promise<void> {
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  for (const key of cacheKeys) {
    localStorage.removeItem(key);
  }
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  return localStorage.getItem(SYNC_TIMESTAMP_KEY);
}

/**
 * Check if any cached app data exists in localStorage.
 */
export async function hasAnyCachedData(): Promise<boolean> {
  const keys = Object.keys(localStorage);
  return keys.some((k) => k.startsWith(CACHE_PREFIX));
}

/**
 * Check current network status
 */
export async function isOnline(): Promise<boolean> {
  return navigator.onLine;
}

/**
 * Persist auth session to localStorage
 */
export async function persistAuthSession(session: {
  access_token: string;
  refresh_token: string;
}): Promise<void> {
  localStorage.setItem('cuk_auth_session', JSON.stringify(session));
}

/**
 * Retrieve persisted auth session
 */
export async function getPersistedAuthSession(): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  const value = localStorage.getItem('cuk_auth_session');
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Clear persisted auth session
 */
export async function clearPersistedAuthSession(): Promise<void> {
  localStorage.removeItem('cuk_auth_session');
}
