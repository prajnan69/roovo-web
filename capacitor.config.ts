import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roovo.app',
  appName: 'Roovo',
  webDir: 'dist',
  android: {
    adjustMarginsForEdgeToEdge: 'auto' // or 'force' or 'disable'
  },
  plugins: {
    LiveUpdate: {
      appId: '94f0b6fd-9585-427d-839f-c09989a1ceaf',
      serverDomain: 'roovo-backend.fly.dev',
      defaultChannel: 'testing',
      readyTimeout: 10000
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      showSpinner: false
    }
  },
};

export default config;
