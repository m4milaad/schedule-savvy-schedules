import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));
vi.mock('@/lib/logger', () => ({ default: { error: vi.fn() } }));

// Node 25+ ships its own (unusable) localStorage global that hides jsdom's, so bring a small one.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const { unregisterPush } = await import('./push');

describe('unregisterPush', () => {
  beforeEach(() => {
    rpc.mockReset();
    localStorage.setItem('cuk_push_token', 'tok');
  });

  it('keeps the token and retries on reconnect when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    rpc.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });
    await unregisterPush();
    expect(localStorage.getItem('cuk_push_token')).toBe('tok');

    rpc.mockResolvedValueOnce({ error: null });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(localStorage.getItem('cuk_push_token')).toBeNull());
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
