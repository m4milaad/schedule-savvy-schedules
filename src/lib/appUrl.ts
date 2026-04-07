/**
 * Returns the base URL for the application.
 * In production, uses VITE_APP_URL env var to avoid Android WebView's virtual host.
 * Falls back to window.location.origin for development.
 */
export function getAppBaseUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return window.location.origin;
}
