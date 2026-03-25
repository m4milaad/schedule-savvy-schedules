import { Capacitor } from '@capacitor/core';

/**
 * Supabase-compatible storage adapter.
 * - On native (Android/iOS): uses @capacitor/preferences so the session
 *   survives app restarts and WebView memory pressure.
 * - On web: falls back to localStorage (standard browser behaviour).
 */

const isNative = Capacitor.isNativePlatform();

async function getPreferences() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

export const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!isNative) return localStorage.getItem(key);
    const Preferences = await getPreferences();
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isNative) { localStorage.setItem(key, value); return; }
    const Preferences = await getPreferences();
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    if (!isNative) { localStorage.removeItem(key); return; }
    const Preferences = await getPreferences();
    await Preferences.remove({ key });
  },
};
