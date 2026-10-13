import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syllabdosth.app',
  appName: 'SyllabDosth',
  webDir: 'out',
  server: {
    url: 'https://www.syllabdosth.com',
    cleartext: false,
  },
};

export default config;