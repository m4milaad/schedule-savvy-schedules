import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

/** Bridge the Android app injects (android/app/src/main/java/com/cukacadex/app/MainActivity.kt). */
interface AndroidPush {
  /** Asks for notification permission, then calls window.onAndroidPushToken with the FCM token. */
  register(): void;
}

declare global {
  interface Window {
    AndroidPush?: AndroidPush;
    onAndroidPushToken?: (token: string) => void;
  }
}

// Kept across launches: a session can end while the app is closed, and the next launch must still unlink the phone.
const TOKEN_KEY = 'cuk_push_token';
let registered = false;

// A failed unlink (usually offline) is retried with backoff, or on reconnect when offline; the token is kept until it works.
const MAX_UNREGISTER_RETRIES = 5;
let unregisterRetries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function retryUnregister(): void {
  void unregisterPush();
}

function stopUnregisterRetry(): void {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  window.removeEventListener('online', retryUnregister);
  unregisterRetries = 0;
}

function scheduleUnregisterRetry(): void {
  if (retryTimer !== undefined) return; // one already pending (useAuth calls this from several components)
  if (unregisterRetries >= MAX_UNREGISTER_RETRIES) return; // the next launch or sign-out tries again
  unregisterRetries++;
  if (navigator.onLine) {
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      retryUnregister();
    }, 2 ** unregisterRetries * 1000);
  } else {
    window.removeEventListener('online', retryUnregister);
    window.addEventListener('online', retryUnregister, { once: true });
  }
}

/** Links this device to the signed-in user so notifications reach it as push. No-op outside the app. */
export function registerPush(): void {
  // useAuth runs in several components at once; one registration per sign-in is enough.
  if (!window.AndroidPush || registered) return;
  registered = true;
  stopUnregisterRetry(); // signed in again: this device should keep its pushes
  window.onAndroidPushToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    void supabase.rpc('register_device_token', { p_token: token }).then(({ error }) => {
      if (error) logger.error('Push registration failed:', error);
    });
  };
  window.AndroidPush.register();
}

/** Stops pushes to this device. Works without a session: the token alone identifies the device. */
export async function unregisterPush(): Promise<void> {
  registered = false;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    stopUnregisterRetry();
    return;
  }
  const { error } = await supabase.rpc('unregister_device_token', { p_token: token });
  if (registered) return; // signed in while the call was in flight: keep the token and stop retrying
  if (error) {
    logger.error('Push unregistration failed:', error);
    scheduleUnregisterRetry();
  } else {
    localStorage.removeItem(TOKEN_KEY);
    stopUnregisterRetry();
  }
}
