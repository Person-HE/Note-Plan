import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noteplan.app',
  appName: 'Note-Plan',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#faf8f5',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    Haptics: {},
    Preferences: {},
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#faf8f5',
    allowMixedContent: true,
  },
};

export default config;
