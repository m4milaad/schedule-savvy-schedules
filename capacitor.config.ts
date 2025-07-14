
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cuk.examschedule',
  appName: 'CUK DateSheet',
  webDir: 'dist',
  server: {
    url: 'https://cuk-examschedule.netlify.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
