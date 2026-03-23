import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cukacadex.app',
  appName: 'CUK Acadex',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#0a0a0b'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0b',
      overlaysWebView: false
    }
  }
};

export default config;
