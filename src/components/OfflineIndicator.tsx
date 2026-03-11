import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      setLastSynced(new Date().toLocaleTimeString());
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    // Load last sync time from localStorage
    const stored = localStorage.getItem('cuk-last-sync');
    if (stored) setLastSynced(stored);

    // Update sync time periodically when online
    if (navigator.onLine) {
      const now = new Date().toLocaleTimeString();
      setLastSynced(now);
      localStorage.setItem('cuk-last-sync', now);
    }

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
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
