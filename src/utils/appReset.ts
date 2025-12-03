/**
 * App Reset Utility
 * Clears all cached data, service workers, and storage to fix offline/404 loops
 */

export interface ResetOptions {
  reloadAfterReset?: boolean;
  onProgress?: (message: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Comprehensive app reset function that clears all cached data
 * @param options Configuration options for the reset process
 * @returns Promise that resolves when reset is complete
 */
export async function resetApp(options: ResetOptions = {}): Promise<void> {
  const {
    reloadAfterReset = true,
    onProgress,
    onError,
  } = options;

  const logProgress = (message: string) => {
    console.log(`[App Reset] ${message}`);
    onProgress?.(message);
  };

  try {
    logProgress('Starting app reset...');

    // 1. Clear all Cache Storage (Service Worker caches)
    if ('caches' in window) {
      logProgress('Clearing cache storage...');
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          logProgress(`Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      logProgress(`Cleared ${cacheNames.length} cache(s)`);
    }

    // 2. Unregister all Service Workers
    if ('serviceWorker' in navigator) {
      logProgress('Unregistering service workers...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => {
          logProgress(`Unregistering service worker: ${registration.scope}`);
          return registration.unregister();
        })
      );
      logProgress(`Unregistered ${registrations.length} service worker(s)`);
    }

    // 3. Clear LocalStorage
    logProgress('Clearing localStorage...');
    const localStorageKeys = Object.keys(localStorage);
    localStorage.clear();
    logProgress(`Cleared ${localStorageKeys.length} localStorage item(s)`);

    // 4. Clear SessionStorage
    logProgress('Clearing sessionStorage...');
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorage.clear();
    logProgress(`Cleared ${sessionStorageKeys.length} sessionStorage item(s)`);

    // 5. Clear IndexedDB
    if ('indexedDB' in window) {
      logProgress('Clearing IndexedDB...');
      try {
        const databases = await window.indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              logProgress(`Deleting database: ${db.name}`);
              return new Promise<void>((resolve, reject) => {
                const request = window.indexedDB.deleteDatabase(db.name!);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
                request.onblocked = () => {
                  console.warn(`Database ${db.name} deletion blocked`);
                  resolve(); // Continue anyway
                };
              });
            }
            return Promise.resolve();
          })
        );
        logProgress(`Cleared ${databases.length} IndexedDB database(s)`);
      } catch (error) {
        // Some browsers don't support indexedDB.databases()
        logProgress('IndexedDB databases() not supported, skipping...');
      }
    }

    // 6. Clear Cookies
    logProgress('Clearing cookies...');
    const cookies = document.cookie.split(';');
    let cookieCount = 0;
    
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      
      if (name) {
        // Clear for current path
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        // Clear for root path
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
        // Clear for current domain
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${window.location.hostname};path=/`;
        // Clear for parent domain
        const domainParts = window.location.hostname.split('.');
        if (domainParts.length > 1) {
          const parentDomain = domainParts.slice(-2).join('.');
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.${parentDomain};path=/`;
        }
        cookieCount++;
      }
    }
    logProgress(`Cleared ${cookieCount} cookie(s)`);

    // 7. Clear any application cache (deprecated but still check)
    if ('applicationCache' in window) {
      const appCache = (window as any).applicationCache;
      if (appCache && appCache.status !== undefined && appCache.UNCACHED !== undefined) {
        if (appCache.status !== appCache.UNCACHED) {
          logProgress('Application cache detected (deprecated API)');
          // Application cache is deprecated and can't be cleared programmatically
        }
      }
    }

    logProgress('App reset completed successfully!');

    // 8. Reload the page if requested
    if (reloadAfterReset) {
      logProgress('Reloading page...');
      // Use a small delay to ensure all cleanup is complete
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 500);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logProgress(`Error during reset: ${errorMessage}`);
    onError?.(error instanceof Error ? error : new Error(errorMessage));
    throw error;
  }
}

/**
 * Check if the app might be stuck in an offline/cache loop
 * @returns Object with diagnostic information
 */
export async function checkAppHealth(): Promise<{
  hasCaches: boolean;
  cacheCount: number;
  hasServiceWorkers: boolean;
  serviceWorkerCount: number;
  localStorageSize: number;
  cookieCount: number;
}> {
  const health = {
    hasCaches: false,
    cacheCount: 0,
    hasServiceWorkers: false,
    serviceWorkerCount: 0,
    localStorageSize: 0,
    cookieCount: 0,
  };

  // Check caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    health.hasCaches = cacheNames.length > 0;
    health.cacheCount = cacheNames.length;
  }

  // Check service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    health.hasServiceWorkers = registrations.length > 0;
    health.serviceWorkerCount = registrations.length;
  }

  // Check localStorage
  health.localStorageSize = Object.keys(localStorage).length;

  // Check cookies
  health.cookieCount = document.cookie.split(';').filter(c => c.trim()).length;

  return health;
}
