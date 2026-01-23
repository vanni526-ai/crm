import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.course.crm',
  appName: '课程交付CRM',
  webDir: 'dist/public',
  server: {
    // 开发模式下可以配置为本地服务器地址
    // url: 'http://localhost:3000',
    // cleartext: true
  },
  android: {
    allowMixedContent: true,
    // 允许网络访问
    webContentsDebuggingEnabled: true
  }
};

export default config;
