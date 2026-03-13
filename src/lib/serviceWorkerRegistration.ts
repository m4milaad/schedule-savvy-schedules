import { Capacitor } from '@capacitor/core';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const isNativeApp = Capacitor.isNativePlatform();
  const shouldRegister = import.meta.env.PROD && !isNativeApp;

  // In web preview/dev, remove stale SW + caches so latest code always loads
  if (!shouldRegister) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });

    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames
          .filter((name) => name.startsWith('cuk-'))
          .forEach((name) => {
            caches.delete(name);
          });
      });
    }

    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.log('[SW] Registered with scope:', registration.scope);

      // Check for updates periodically (every 5 minutes)
      setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);

      // Handle new service worker available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — activate immediately
            console.log('[SW] New version available, activating...');
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });

      // Reload once when new SW takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}
