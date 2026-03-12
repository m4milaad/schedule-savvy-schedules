import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { Network } from '@capacitor/network';
import { getLastSyncTimestamp } from '@/lib/offlineCache';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

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

    // Listen for changes
    const handler = Network.addListener('networkStatusChange', (status) => {
      setIsOffline(!status.connected);
      if (status.connected) {
        setLastSynced(new Date().toLocaleTimeString());
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-destructive-foreground shadow-lg animate-in slide-in-from-bottom-4">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">
        You're offline — showing cached data
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
