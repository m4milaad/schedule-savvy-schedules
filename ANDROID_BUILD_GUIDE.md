
# Android App Build Guide - CUK Exam Schedule

This guide will help you build the Android app for the Central University of Kashmir Exam Scheduling System.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
2. **Android Studio** (latest version)
3. **Java Development Kit (JDK)** 11 or higher
4. **Git**

## Step 1: Setup Development Environment

### Install Android Studio
1. Download Android Studio from [developer.android.com](https://developer.android.com/studio)
2. Install Android Studio and open it
3. Go to `Tools > SDK Manager` and install:
   - Android SDK Platform (API level 33 or higher)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools

### Set Environment Variables
Add these to your system environment variables:
```bash
# Windows
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\YourUsername\AppData\Local\Android\Sdk

# macOS/Linux
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Step 2: Get the Project Code

1. **Export to GitHub** (Recommended):
   - Click the "Export to GitHub" button in Lovable
   - Clone your repository locally:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. **Or download directly** from Lovable as a ZIP file and extract it

## Step 3: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Initialize Capacitor (if not already done)
npx cap init

# Add Android platform
npx cap add android
```

## Step 4: Build the Web App

```bash
# Build the production version
npm run build
```

## Step 5: Sync with Android

```bash
# Sync the web assets with Android
npx cap sync android
```

## Step 6: Open in Android Studio

```bash
# Open the Android project in Android Studio
npx cap open android
```

This will open Android Studio with your project loaded.

## Step 7: Configure the App in Android Studio

1. **Wait for Gradle sync** to complete (this may take several minutes the first time)

2. **Configure app details** in `android/app/src/main/res/values/strings.xml`:
   ```xml
   <resources>
       <string name="app_name">CUK Exam Schedule</string>
       <string name="title_activity_main">CUK Exam Schedule</string>
       <string name="package_name">app.lovable.c26871e166834556bc27845d5db5696e</string>
       <string name="custom_url_scheme">app.lovable.c26871e166834556bc27845d5db5696e</string>
   </resources>
   ```

3. **Update app permissions** in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
   ```

## Step 8: Create a Virtual Device (Emulator)

1. In Android Studio, go to `Tools > AVD Manager`
2. Click `Create Virtual Device`
3. Choose a device (e.g., Pixel 6)
4. Select a system image (API level 33 or higher)
5. Click `Finish`

## Step 9: Run the App

### Option A: Run on Emulator
1. Start your virtual device from AVD Manager
2. In Android Studio, click the **Run** button (green play icon)
3. Select your virtual device

### Option B: Run on Physical Device
1. Enable **Developer Options** on your Android phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Go to Settings > Developer Options
   - Turn on "USB Debugging"
3. Connect your phone via USB
4. In Android Studio, click **Run** and select your device

## Step 10: Build APK for Distribution

### Debug APK (for testing)
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for production)

1. **Generate keystore** (do this once):
   ```bash
   keytool -genkey -v -keystore cuk-exam-schedule.keystore -alias cuk-app -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Create signing config** in `android/app/build.gradle`:
   ```gradle
   android {
     ...
     signingConfigs {
       release {
         storeFile file('../../cuk-exam-schedule.keystore')
         storePassword 'your-keystore-password'
         keyAlias 'cuk-app'
         keyPassword 'your-key-password'
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
         ...
       }
     }
   }
   ```

3. **Build release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   APK location: `android/app/build/outputs/apk/release/app-release.apk`

## App Features

The mobile app includes:
- **Mobile-optimized interface** for viewing exam schedules
- **Semester filtering** to view specific semester exams
- **Offline-capable** once data is loaded
- **Pull-to-refresh** functionality
- **Responsive design** for different screen sizes
- **Real-time data** from Supabase database

## Troubleshooting

### Common Issues:

1. **Gradle sync failed**:
   - Check internet connection
   - Try `File > Invalidate Caches and Restart`

2. **SDK not found**:
   - Ensure ANDROID_HOME is set correctly
   - Install required SDK components

3. **App crashes on startup**:
   - Check the network URL in `capacitor.config.ts`
   - Ensure the web app builds successfully

4. **Network requests fail**:
   - Add network security config for HTTP requests
   - Check CORS settings in Supabase

### Getting Help:
- Check the Android Studio logs in the `Logcat` tab
- Ensure all environment variables are set correctly
- Verify the web app works in a browser first

## Updates and Maintenance

To update the app:
1. Make changes to the web app
2. Run `npm run build`
3. Run `npx cap sync android`
4. Rebuild in Android Studio

## Distribution

To distribute your app:
1. Build a release APK following Step 10
2. Upload to Google Play Store (requires developer account)
3. Or distribute the APK file directly to users

---

**Note**: This app fetches data from your live Supabase database, so students will always see the most current exam schedule.
