// App logger.
// - Development: prints everything to the browser console.
// - Production: the console stays silent so users never see internal messages.
//   Errors are sent to the audit_logs table instead, where only the super admin
//   can read them (RLS: insert allowed for your own user_id, select admin-only).

const isDev = import.meta.env.DEV;

// The Supabase client calls logger.error when a request fails, and the sink
// below writes through that same client, so a failed sink write could loop.
// This guard drops any error raised while a sink write is in flight.
let sinking = false;

function describe(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ')
    .slice(0, 4000);
}

async function sinkError(args: unknown[]): Promise<void> {
  if (sinking) return;
  sinking = true;
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return; // audit_logs RLS requires user_id = auth.uid()
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_type: (user.user_metadata?.user_type as string) || 'unknown',
      table_name: 'client',
      action: 'client_error',
      description: describe(args),
      new_data: { path: location.pathname, at: new Date().toISOString() },
    });
  } catch {
    // Logging must never throw or recurse.
  } finally {
    sinking = false;
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
      return;
    }
    void sinkError(args);
  },
};

export default logger;
