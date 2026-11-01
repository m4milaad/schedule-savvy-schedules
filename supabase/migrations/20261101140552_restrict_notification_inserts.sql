-- Notifications could be inserted by any signed-in user for any user_id
-- ("System can insert notifications" WITH CHECK (true)), so a student could
-- send convincing fake notifications to an admin.
--
-- The app only ever inserts a notification for the signed-in user
-- (useRealtimeNotifications -> storeNotification(user.id, ...)).
-- Server code using the service role bypasses RLS and is unaffected.

DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;

CREATE POLICY "Users can insert their own notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
