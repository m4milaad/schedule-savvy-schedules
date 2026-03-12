import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

const CACHE_PREFIX = 'cuk_cache_';
const SYNC_TIMESTAMP_KEY = 'cuk_last_sync_timestamp';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Save data to Capacitor Preferences cache
 */
export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const cached: CachedData<T> = {
    data,
    timestamp: Date.now(),
  };
  await Preferences.set({
    key: `${CACHE_PREFIX}${key}`,
    value: JSON.stringify(cached),
  });
  // Update global last-synced timestamp
  await Preferences.set({
    key: SYNC_TIMESTAMP_KEY,
    value: new Date().toISOString(),
  });
}

/**
 * Get cached data from Capacitor Preferences
 */
export async function getCachedData<T>(key: string): Promise<CachedData<T> | null> {
  const { value } = await Preferences.get({ key: `${CACHE_PREFIX}${key}` });
  if (!value) return null;
  try {
    return JSON.parse(value) as CachedData<T>;
  } catch {
    return null;
  }
}

/**
 * Remove a specific cache entry
 */
export async function removeCachedData(key: string): Promise<void> {
  await Preferences.remove({ key: `${CACHE_PREFIX}${key}` });
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  const { keys } = await Preferences.keys();
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  for (const key of cacheKeys) {
    await Preferences.remove({ key });
  }
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  const { value } = await Preferences.get({ key: SYNC_TIMESTAMP_KEY });
  return value;
}

/**
 * Check current network status
 */
export async function isOnline(): Promise<boolean> {
  const status = await Network.getStatus();
  return status.connected;
}

/**
 * Persist auth session to Preferences
 */
export async function persistAuthSession(session: {
  access_token: string;
  refresh_token: string;
}): Promise<void> {
  await Preferences.set({
    key: 'cuk_auth_session',
    value: JSON.stringify(session),
  });
}

/**
 * Retrieve persisted auth session
 */
export async function getPersistedAuthSession(): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  const { value } = await Preferences.get({ key: 'cuk_auth_session' });
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
  await Preferences.remove({ key: 'cuk_auth_session' });
}
