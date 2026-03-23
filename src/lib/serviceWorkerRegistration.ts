import { Capacitor } from '@capacitor/core';
import logger from './logger';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const isNativeApp = Capacitor.isNativePlatform();
  const isSecureLikeContext = window.isSecureContext || window.location.hostname === 'localhost';
  const shouldRegister = import.meta.env.PROD && isSecureLikeContext;

  // In web preview/dev, remove stale SW + caches so latest code always loads.
  // Keep native caches intact so supported runtimes can keep offline data.
  if (!shouldRegister) {
    if (!isNativeApp) {
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
    } else {
      logger.info('[SW] Skipping registration: secure context unavailable for current native runtime.');
    }

    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      logger.info('[SW] Registered with scope:', registration.scope);

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
            // New version available - activate immediately
            logger.info('[SW] New version available, activating...');
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
      logger.error('[SW] Registration failed:', error);
    }
  });
}
