package com.cukacadex.app

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    /** Serves android_asset/… as https://appassets.androidplatform.net/… so scripts/CSS load (file:// is blocked by CORS in modern WebView). Paths map 1:1 (e.g. /public/index.html → assets/public/index.html). */
    private val assetLoader: WebViewAssetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen
        installSplashScreen()
        
        super.onCreate(savedInstanceState)

        val isDebuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        
        // Allow remote webview debugging only in debug builds.
        WebView.setWebContentsDebuggingEnabled(isDebuggable)
        
        // Create WebView
        webView = WebView(this)
        setContentView(webView)
        
        // Configure WebView settings
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = if (isDebuggable) {
                WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            } else {
                WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            setSupportZoom(true)
            builtInZoomControls = false
            displayZoomControls = false
            loadWithOverviewMode = true
            useWideViewPort = true
        }
        
        // Set WebViewClient to handle navigation
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                Log.d("WebView", "Navigation requested: $url")

                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (url.startsWith("https://appassets.androidplatform.net/")) {
                        return false
                    }
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e("WebView", "Failed to open external link: $url", e)
                        return false
                    }
                }

                if (url.startsWith("file://")) {
                    Log.d("WebView", "Blocked navigation to: $url")
                    return true
                }

                return false
            }
            
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("WebView", "Page finished loading: $url")
            }
        }
        
        // Set WebChromeClient for better JavaScript support and console logging
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d("WebView", "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}")
                return true
            }
        }
        
        webView.loadUrl("https://appassets.androidplatform.net/public/index.html")
    }
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
    
    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
