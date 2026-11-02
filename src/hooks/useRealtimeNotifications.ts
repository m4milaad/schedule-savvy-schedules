import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeNotificationsProps {
  userId?: string;
  enabled?: boolean;
}

/**
 * Toasts each new notification while the dashboard is open.
 * The rows themselves are written by database triggers (seats, datesheet, leave, assignments, attendance), which also push them to the Android app.
 */
export function useRealtimeNotifications({ userId, enabled = true }: UseRealtimeNotificationsProps): null {
  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase
      .channel(`notification-toasts:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as { title: string; message: string; type: string };
          const show = n.type === 'success' ? toast.success : n.type === 'warning' ? toast.warning : n.type === 'error' ? toast.error : toast.info;
          show(n.title, { description: n.message, duration: n.type === 'warning' ? 10000 : 8000 });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, enabled]);

  return null;
}
