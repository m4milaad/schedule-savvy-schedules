
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c26871e166834556bc27845d5db5696e',
  appName: 'CUK DateSheet',
  webDir: 'dist',
  server: {
    url: 'https://c26871e1-6683-4556-bc27-845d5db5696e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
