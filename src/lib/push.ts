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

/** Links this device to the signed-in user so notifications reach it as push. No-op outside the app. */
export function registerPush(): void {
  // useAuth runs in several components at once; one registration per sign-in is enough.
  if (!window.AndroidPush || registered) return;
  registered = true;
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
  if (!token) return;
  const { error } = await supabase.rpc('unregister_device_token', { p_token: token });
  if (error) logger.error('Push unregistration failed:', error);
  else localStorage.removeItem(TOKEN_KEY);
}
