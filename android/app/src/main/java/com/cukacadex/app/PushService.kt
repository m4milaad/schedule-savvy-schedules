package com.cukacadex.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Shows the data messages supabase/functions/send-push sends for each new user_notifications row.
 * Tokens are registered by the web app (src/lib/push.ts) on every sign-in, so a rotated token is
 * picked up on the next launch; nothing to do in onNewToken.
 */
class PushService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        // In the foreground the dashboard already shows it (toast and bell).
        if (MainActivity.visible) return
        val data = message.data
        val title = data["title"] ?: return
        show(this, data["id"]?.hashCode() ?: title.hashCode(), title, data["message"].orEmpty())
    }

    companion object {
        private const val CHANNEL = "notifications"

        fun show(context: Context, id: Int, title: String, text: String) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.getSystemService(NotificationManager::class.java).createNotificationChannel(
                    NotificationChannel(CHANNEL, "Notifications", NotificationManager.IMPORTANCE_HIGH)
                        .apply { description = "Exam schedule and seating updates" },
                )
            }
            val open = PendingIntent.getActivity(
                context, 0,
                Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            val notification = NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(open)
                .build()
            // Without the permission (Android 13+, denied) Android drops it; nothing else to do.
            if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
                @Suppress("MissingPermission")
                NotificationManagerCompat.from(context).notify(id, notification)
            }
        }
    }
}
