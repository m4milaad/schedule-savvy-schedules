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

let deviceToken: string | null = null;
let registered = false;

/** Links this device to the signed-in user so notifications reach it as push. No-op outside the app. */
export function registerPush(): void {
  // useAuth runs in several components at once; one registration per sign-in is enough.
  if (!window.AndroidPush || registered) return;
  registered = true;
  window.onAndroidPushToken = (token) => {
    deviceToken = token;
    void supabase.rpc('register_device_token', { p_token: token }).then(({ error }) => {
      if (error) logger.error('Push registration failed:', error);
    });
  };
  window.AndroidPush.register();
}

/** Stops pushes to this device; call before signing out. */
export async function unregisterPush(): Promise<void> {
  registered = false;
  if (!deviceToken) return;
  const { error } = await supabase.rpc('unregister_device_token', { p_token: deviceToken });
  if (error) logger.error('Push unregistration failed:', error);
  deviceToken = null;
}
