package com.cukacadex.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.webkit.WebViewAssetLoader
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import java.io.File

/** Hosts the bundled web app (assets/public, copied by `npm run android:copy`) in a WebView. */
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var pendingFiles: ValueCallback<Array<Uri>>? = null

    /**
     * Serves assets/public/… at https://appassets.androidplatform.net/… so scripts/CSS load (file:// is blocked by CORS
     * in modern WebView) and the web app sees the same paths as on the website ("/", "/student-dashboard", …).
     * Paths without a file extension are client-side routes, so they get index.html and react-router takes over.
     */
    private val assetLoader: WebViewAssetLoader by lazy {
        val assets = WebViewAssetLoader.AssetsPathHandler(this)
        WebViewAssetLoader.Builder()
            .addPathHandler("/") { path ->
                val file = path.ifEmpty { "index.html" }
                val response = assets.handle("public/$file")
                // AssetsPathHandler answers a missing file with an empty response rather than null.
                if (response?.data != null || file.substringAfterLast('/').contains('.')) response
                else assets.handle("public/index.html")
            }
            .build()
    }

    /** Android 13+ asks before showing notifications; the token is fetched either way (the user can allow it later). */
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { sendPushToken() }

    /** `<input type="file">`: the WebView asks, the system picker answers. */
    private val pickFiles = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        pendingFiles?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
        pendingFiles = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        val debuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        WebView.setWebContentsDebuggingEnabled(debuggable)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            // Debug builds may call the local chatbot API over http.
            mixedContentMode = if (debuggable) WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE else WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            loadWithOverviewMode = true
            useWideViewPort = true
        }

        webView.addJavascriptInterface(Downloads(), "AndroidDownloads")
        // Builds without google-services.json have no Firebase, so the web app simply skips push.
        if (FirebaseApp.getApps(this).isNotEmpty()) webView.addJavascriptInterface(Push(), "AndroidPush")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                assetLoader.shouldInterceptRequest(request.url)

            // Our own pages stay here; any other link (credits, files, email apps) opens outside the app.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.host == APP_HOST) return false
                openExternally(url)
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                pendingFiles?.onReceiveValue(null)
                pendingFiles = callback
                return try {
                    pickFiles.launch(params.createIntent())
                    true
                } catch (e: Exception) {
                    pendingFiles = null
                    false
                }
            }
        }

        // Plain-URL downloads (not blobs) go to the browser, which handles them.
        webView.setDownloadListener { url, _, _, _, _ -> openExternally(Uri.parse(url)) }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack()
                else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl("https://$APP_HOST/")
            Updater.check(this)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onStart() {
        super.onStart()
        visible = true
    }

    override fun onStop() {
        visible = false
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private fun openExternally(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (e: Exception) {
            Log.w(TAG, "No app can open $uri", e)
        }
    }

    /** Called by src/lib/download.ts: writes the file to Downloads and opens it. */
    private inner class Downloads {
        @JavascriptInterface
        fun save(base64: String, filename: String, mimeType: String) {
            val name = filename.replace(Regex("[\\\\/:*?\"<>|]"), "_")
            try {
                val uri = write(Base64.decode(base64, Base64.DEFAULT), name, mimeType)
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Saved $name to Downloads", Toast.LENGTH_SHORT).show()
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, mimeType).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
                    } catch (_: Exception) {
                        // No viewer installed for this type; the file is still saved.
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Saving $name failed", e)
                runOnUiThread { Toast.makeText(this@MainActivity, "Could not save $name", Toast.LENGTH_LONG).show() }
            }
        }

        private fun write(bytes: ByteArray, name: String, mimeType: String): Uri {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, name)
                    put(MediaStore.Downloads.MIME_TYPE, mimeType)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: error("MediaStore refused $name")
                contentResolver.openOutputStream(uri)!!.use { it.write(bytes) }
                return uri
            }
            // Before Android 10 the public Downloads folder needs a storage permission; the app's own one does not.
            val file = File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name).apply { writeBytes(bytes) }
            return FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
        }
    }

    /** Called by src/lib/push.ts after sign-in; answers through window.onAndroidPushToken. */
    private inner class Push {
        @JavascriptInterface
        fun register() = runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
            else sendPushToken()
        }
    }

    // shortcut: getToken() is deprecated in firebase-messaging 26 in favour of register() + PushService.onRegistered;
    // move over when a release removes it.
    @Suppress("DEPRECATION")
    private fun sendPushToken() {
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                // FCM tokens are [A-Za-z0-9:_-], so quoting needs no escaping.
                webView.evaluateJavascript("window.onAndroidPushToken && window.onAndroidPushToken('$token')", null)
            }
            .addOnFailureListener { Log.w(TAG, "No FCM token", it) }
    }

    companion object {
        /** True while the app is on screen, so PushService leaves notifications to the web UI. */
        @Volatile var visible = false
        private const val APP_HOST = "appassets.androidplatform.net"
        private const val TAG = "CukAcadex"
    }
}
