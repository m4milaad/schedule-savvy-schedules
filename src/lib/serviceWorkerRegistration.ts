import logger from './logger';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const isNativeApp = /Android.*wv/.test(navigator.userAgent);
  const isSecureLikeContext = window.isSecureContext || window.location.hostname === 'localhost';
  // Service workers are unreliable with WebViewAssetLoader (virtual https host); skip in Android shell.
  const shouldRegister =
    import.meta.env.PROD && isSecureLikeContext && !isNativeApp;

  // In web preview/dev, remove stale SW + caches so latest code always loads.
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
      logger.info('[SW] Skipping registration in Android WebView (not used for this shell).');
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    }

    return;
  }

  window.addEventListener('load', async () => {
    try {
      const base = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
      const swScript = `${base}service-worker.js`;
      const registration = await navigator.serviceWorker.register(swScript);
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
