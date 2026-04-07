
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import logger from '@/lib/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    logger.error('Supabase HTTP request failed', { error });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    // Use localStorage for auth state
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
