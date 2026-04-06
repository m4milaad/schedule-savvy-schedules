# Android Build Instructions

Your app has been successfully migrated from Capacitor to a native Kotlin-based WebView implementation.

## What Changed

- ✅ Removed all Capacitor dependencies and bridge code
- ✅ Converted MainActivity from Java to Kotlin with native WebView
- ✅ Replaced Capacitor APIs with web-standard alternatives:
  - `@capacitor/preferences` → `localStorage`
  - `@capacitor/network` → `navigator.onLine` and online/offline events
  - `@capacitor/status-bar` → Removed (handled by Android theme)
  - `@capacitor/splash-screen` → Native Android splash screen
- ✅ Added Kotlin support to the Android project
- ✅ Updated build scripts for easier deployment

## Building the App

### Prerequisites
- Android Studio installed
- JDK 11 or higher
- Android SDK with API level matching your targetSdkVersion
- Node.js and npm installed

### Quick Build Steps

1. **Build and copy web assets in one command:**
   ```bash
   npm run build && npm run android:copy
   ```

2. **Build the APK:**
   ```bash
   npm run android:build
   ```
   The APK will be in `android/app/build/outputs/apk/release/`

3. **Install on connected device (optional):**
   ```bash
   npm run android:install
   ```

### Individual Steps

If you prefer to run steps separately:

1. **Build your web app:**
   ```bash
   npm run build
   ```

2. **Copy web assets to Android:**
   ```bash
   npm run android:copy
   ```
   This copies the `dist` folder to `android/app/src/main/assets/public`

3. **Build the APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

### Manual Build with Android Studio

1. Open the `android` folder in Android Studio
2. Sync Gradle files (File → Sync Project with Gradle Files)
3. Build → Build Bundle(s) / APK(s) → Build APK(s)
4. Find the APK in `android/app/build/outputs/apk/release/`

## Key Files

- `android/app/src/main/java/com/cukacadex/app/MainActivity.kt` - Main activity with WebView
- `android/app/build.gradle` - App-level Gradle configuration with Kotlin support
- `android/build.gradle` - Project-level Gradle configuration with Kotlin plugin
- `src/lib/offlineCache.ts` - localStorage-based caching (replaces Capacitor Preferences)
- `src/components/OfflineIndicator.tsx` - Network status indicator using web APIs

## WebView Features

The native Kotlin WebView implementation includes:
- ✅ JavaScript enabled with full ES6+ support
- ✅ DOM storage enabled for localStorage/sessionStorage
- ✅ Local file access for loading your web app from assets
- ✅ Back button navigation support
- ✅ Splash screen support via Android Core Splash Screen
- ✅ Mixed content support for development
- ✅ WebChromeClient for enhanced JavaScript features
- ✅ Proper WebView lifecycle management

## Web API Replacements

Your app now uses standard web APIs instead of Capacitor:

| Old (Capacitor) | New (Web Standard) |
|----------------|-------------------|
| `Preferences.get/set` | `localStorage.getItem/setItem` |
| `Network.getStatus()` | `navigator.onLine` |
| `Network.addListener` | `window.addEventListener('online/offline')` |
| `Capacitor.isNativePlatform()` | `/Android.*wv/.test(navigator.userAgent)` |
| `StatusBar.setStyle()` | Android theme configuration |

## Notes

- The app loads from `file:///android_asset/public/index.html`
- Always run `npm run build` before copying assets to Android
- The WebView uses localStorage for all caching and auth persistence
- Network status is detected using standard `navigator.onLine` API
- For production builds, the app is signed with the keystore at `android/cuk-acadex.keystore`

## Troubleshooting

**Build fails with "Kotlin not found":**
- Make sure you've synced Gradle files in Android Studio
- Check that `kotlin-gradle-plugin` is in `android/build.gradle`

**WebView shows blank screen:**
- Verify assets were copied: check `android/app/src/main/assets/public/index.html` exists
- Check Android Logcat for JavaScript errors
- Ensure `dist` folder was built before copying

**App crashes on launch:**
- Check that all Capacitor imports have been removed from source code
- Verify the build completed successfully with `npm run build`
- Check Android Logcat for stack traces
