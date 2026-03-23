import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Network } from '@capacitor/network';
import { getLastSyncTimestamp, hasAnyCachedData } from '@/lib/offlineCache';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [hasCache, setHasCache] = useState(false);

  useEffect(() => {
    // Check initial status
    Network.getStatus().then((status) => {
      setIsOffline(!status.connected);
    });

    // Load last sync timestamp
    getLastSyncTimestamp().then((ts) => {
      if (ts) {
        setLastSynced(new Date(ts).toLocaleTimeString());
      }
    });
    hasAnyCachedData().then(setHasCache);

    // Listen for changes
    const handler = Network.addListener('networkStatusChange', (status) => {
      setIsOffline(!status.connected);
      if (status.connected) {
        setLastSynced(new Date().toLocaleTimeString());
        setHasCache(true);
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-destructive-foreground shadow-lg animate-in slide-in-from-bottom-4">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">
        {hasCache
          ? "You're offline - showing cached data"
          : "You're offline - some data may be unavailable"}
      </span>
      {lastSynced && (
        <span className="text-xs opacity-80 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Last synced: {lastSynced}
        </span>
      )}
    </div>
  );
};
