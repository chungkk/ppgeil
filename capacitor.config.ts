import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.papageil.app',
  appName: 'PapaGeil',
  webDir: 'out',
  server: {
    url: 'https://papageil.net',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true
  }
};

export default config;
