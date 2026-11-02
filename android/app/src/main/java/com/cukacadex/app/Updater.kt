package com.cukacadex.app

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Environment
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * On every launch, asks GitHub for the latest release; if its tag is newer than the installed version and it has an
 * APK, offers to download it and hands it to the system installer.
 * An update only installs over this app when both APKs are signed with the same key.
 */
object Updater {
    private const val LATEST_RELEASE = "https://api.github.com/repos/m4milaad/schedule-savvy-schedules/releases/latest"
    private const val APK_TYPE = "application/vnd.android.package-archive"
    private const val TAG = "CukAcadexUpdater"

    fun check(activity: AppCompatActivity) {
        val current = activity.packageManager.getPackageInfo(activity.packageName, 0).versionName ?: return
        Thread {
            try {
                val connection = (URL(LATEST_RELEASE).openConnection() as HttpURLConnection).apply {
                    setRequestProperty("Accept", "application/vnd.github+json")
                    connectTimeout = 10_000
                    readTimeout = 10_000
                }
                val release = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
                val latest = release.getString("tag_name").removePrefix("v")
                if (!isNewer(latest, current)) return@Thread
                val assets = release.getJSONArray("assets")
                val apkUrl = (0 until assets.length()).map { assets.getJSONObject(it) }
                    .firstOrNull { it.getString("name").endsWith(".apk") }
                    ?.getString("browser_download_url") ?: return@Thread
                activity.runOnUiThread { if (!activity.isFinishing) offer(activity, current, latest, apkUrl) }
            } catch (e: Exception) {
                // Offline or rate-limited: try again next launch.
                Log.w(TAG, "Update check failed", e)
            }
        }.start()
    }

    /** Compares dotted versions numerically, so 6.6.10 is newer than 6.6.4. */
    fun isNewer(latest: String, current: String): Boolean {
        val a = latest.split('.').map { it.trim().toIntOrNull() ?: 0 }
        val b = current.split('.').map { it.trim().toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(a.size, b.size)) {
            val diff = a.getOrElse(i) { 0 } - b.getOrElse(i) { 0 }
            if (diff != 0) return diff > 0
        }
        return false
    }

    private fun offer(activity: AppCompatActivity, current: String, latest: String, apkUrl: String) {
        AlertDialog.Builder(activity)
            .setTitle("Update available")
            .setMessage("CUK Acadex $latest is available. You have $current.")
            .setPositiveButton("Update") { _, _ -> download(activity, latest, apkUrl) }
            .setNegativeButton("Later", null)
            .show()
    }

    private fun download(activity: AppCompatActivity, latest: String, apkUrl: String) {
        val app = activity.applicationContext
        val name = "cuk-acadex-$latest.apk"
        // DownloadManager would save a second copy as "-1.apk" instead of replacing an earlier attempt.
        File(app.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name).delete()

        val downloads = app.getSystemService(DownloadManager::class.java)
        val id = downloads.enqueue(
            DownloadManager.Request(Uri.parse(apkUrl))
                .setTitle("CUK Acadex $latest")
                .setMimeType(APK_TYPE)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(app, Environment.DIRECTORY_DOWNLOADS, name),
        )
        Toast.makeText(activity, "Downloading update…", Toast.LENGTH_SHORT).show()

        ContextCompat.registerReceiver(app, object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) != id) return
                app.unregisterReceiver(this)
                install(app, downloads, id, name)
            }
        }, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), ContextCompat.RECEIVER_EXPORTED)
    }

    private fun install(context: Context, downloads: DownloadManager, id: Long, name: String) {
        val ok = downloads.query(DownloadManager.Query().setFilterById(id)).use { c ->
            c.moveToFirst() && c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL
        }
        if (!ok) {
            Toast.makeText(context, "Update download failed", Toast.LENGTH_LONG).show()
            return
        }
        val file = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        // Android asks once to allow installs from this app, then shows the installer.
        context.startActivity(
            Intent(Intent.ACTION_VIEW).setDataAndType(uri, APK_TYPE)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}
