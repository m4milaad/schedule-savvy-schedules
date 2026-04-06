# Android Production Build Guide

Single source of truth for building, signing, validating, and releasing the Kotlin WebView Android app.

## Why This File Exists

- The app uses a native Kotlin `WebView` shell (not Capacitor runtime).
- This file replaces older split instructions and keeps one production-ready path.

## Prerequisites

- Node.js 18+
- npm 9+
- JDK 17 (recommended)
- Android Studio (latest stable)
- Android SDK Platform matching `targetSdkVersion`

## One-Command Build Path

1. Build web assets and copy into Android:
   ```bash
   npm run android:copy
   ```
2. Build release APK:
   ```bash
   npm run android:build
   ```
3. (Optional) install release APK on connected device:
   ```bash
   npm run android:install
   ```

Release artifact:
- `android/app/build/outputs/apk/release/`

## Manual Android Studio Path

1. Open the `android` folder in Android Studio.
2. Sync Gradle files.
3. Build > Build APK(s) or Build App Bundle(s).
4. Verify output under `android/app/build/outputs`.

## Signing for Production

Never store signing secrets in `build.gradle` or commit keystores.

1. Create `android/keystore.properties` from template:
   ```bash
   cp android/keystore.properties.example android/keystore.properties
   ```
2. Fill:
   - `RELEASE_STORE_FILE`
   - `RELEASE_STORE_PASSWORD`
   - `RELEASE_KEY_ALIAS`
   - `RELEASE_KEY_PASSWORD`
3. Ensure these are excluded from version control:
   - `*.keystore`
   - `*.jks`
   - `keystore.properties`

## Security and Release Hardening (Current Setup)

- Release build uses R8 minification and resource shrinking.
- WebView debugging is debug-only.
- Release mixed-content policy is restricted.
- Backup/data extraction rules are explicit in manifest resources.
- File provider paths are scoped down from broad external root patterns.
- CI includes policy checks for hardcoded signing secrets and keystore artifacts.

## Environment Requirements

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CHATBOT_API_URL`

Production guardrails:
- Production build throws if `VITE_CHATBOT_API_URL` is localhost.

## Production Verification Checklist

- `npm run build` succeeds.
- `cd android && ./gradlew assembleRelease` succeeds.
- App launches on a real Android device.
- Core student/admin/teacher flows open and navigate correctly.
- Chatbot endpoint resolves to deployed backend (not localhost).
- No signing secrets in git-tracked files.
- No keystore files committed.

## CI Quality Gates

Workflow:
- `.github/workflows/android-release-gates.yml`

Gates:
- Secret policy scan for Gradle signing leaks.
- Web build.
- Android lint + unit tests.
- Android release assemble.
- Release APK artifact upload.

## Troubleshooting

### Blank screen on launch
- Confirm `android/app/src/main/assets/public/index.html` exists.
- Re-run `npm run android:copy`.
- Check Android Studio Logcat for JS/runtime errors.

### Build fails due to Android toolchain
- Confirm JDK and SDK versions are installed.
- Re-sync Gradle in Android Studio.

### R8 `classes.dex` locked on Windows
- Symptom: `:app:minifyReleaseWithR8` fails with `classes.dex ... being used by another process`.
- Cause: transient file lock (commonly Android Studio, Gradle daemon overlap, or antivirus scan).
- Recovery steps:
  ```powershell
  cd android
  .\gradlew.bat --stop
  .\gradlew.bat clean
  .\gradlew.bat assembleRelease
  ```
- If it keeps happening:
  - Close Android Studio while running CLI release builds.
  - Exclude the project `android/build` and `android/app/build` folders from realtime antivirus scanning.

### Network/API calls fail
- Verify `VITE_CHATBOT_API_URL` points to a reachable HTTPS backend.
- Confirm backend CORS is configured for app origin behavior.

## Release Notes

- Use this guide as the canonical Android release process.
- Keep `ANDROID_BUILD_GUIDE.md` only as a redirect to this file.
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
   npm run android:copy
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
- `npm run android:copy` always rebuilds first and then refreshes Android assets
- The WebView uses localStorage for all caching and auth persistence
- Network status is detected using standard `navigator.onLine` API
- For signed production builds, configure `android/keystore.properties` (use `android/keystore.properties.example` as template)
- Never commit `.keystore`, `.jks`, or `keystore.properties` files

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
