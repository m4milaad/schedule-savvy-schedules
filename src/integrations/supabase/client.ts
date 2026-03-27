
import { createClient } from '@supabase/supabase-js';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { Database } from './types';
import logger from '@/lib/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const isNative = Capacitor.isNativePlatform();

const toHeaderObject = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
};

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  const headers = toHeaderObject(init?.headers ?? (input instanceof Request ? input.headers : undefined));

  // On Android/iOS route Supabase calls through native HTTP to avoid WebView fetch hangs.
  if (isNative && url.startsWith(SUPABASE_URL)) {
    try {
      let body: unknown = init?.body;
      if (typeof body === 'string' && (headers['content-type'] || '').includes('application/json')) {
        try {
          body = JSON.parse(body);
        } catch {
          // keep original string if not valid JSON
        }
      }

      const response = await Promise.race([
        CapacitorHttp.request({
          url,
          method,
          headers,
          data: body,
          connectTimeout: 20000,
          readTimeout: 20000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Native HTTP timeout for ${method} ${url}`)), 20000)
        ),
      ]);

      const payload =
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? {});

      return new Response(payload, {
        status: response.status,
        headers: response.headers as HeadersInit,
      });
    } catch (error) {
      logger.error('Native Supabase HTTP request failed', { url, method, error });
      throw error;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    // Use WebView localStorage for auth state on native.
    // This avoids Capacitor Preferences proxy edge-cases ("Preferences.then()").
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
