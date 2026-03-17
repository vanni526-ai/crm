/**
 * 统一错误日志上报机制
 * 
 * 功能：
 * - 收集错误日志并缓存
 * - 定期批量上报到后端
 * - 支持不同错误级别
 * - 自动捕获设备和用户信息
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 错误级别
export type ErrorLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// 错误日志条目
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: ErrorLevel;
  module: string;
  message: string;
  stack?: string;
  extra?: Record<string, any>;
  platform: string;
  appVersion: string;
  userId?: string;
}

// 日志存储键
const LOG_STORAGE_KEY = 'error_logs';
const MAX_LOG_ENTRIES = 200;
const BATCH_UPLOAD_SIZE = 50;
const UPLOAD_INTERVAL_MS = 60000; // 1分钟

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private uploadTimer: ReturnType<typeof setInterval> | null = null;
  private userId: string | undefined;
  private isInitialized = false;

  /**
   * 初始化日志系统
   */
  async init(userId?: string): Promise<void> {
    if (this.isInitialized) return;
    this.userId = userId;
    
    // 从本地存储恢复未上报的日志
    try {
      const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      // 忽略存储读取错误
    }

    // 启动定期上报
    this.uploadTimer = setInterval(() => {
      this.flush();
    }, UPLOAD_INTERVAL_MS);

    this.isInitialized = true;
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * 记录调试日志
   */
  debug(module: string, message: string, extra?: Record<string, any>): void {
    this.log('debug', module, message, undefined, extra);
  }

  /**
   * 记录信息日志
   */
  info(module: string, message: string, extra?: Record<string, any>): void {
    this.log('info', module, message, undefined, extra);
  }

  /**
   * 记录警告日志
   */
  warn(module: string, message: string, extra?: Record<string, any>): void {
    this.log('warn', module, message, undefined, extra);
  }

  /**
   * 记录错误日志
   */
  error(module: string, message: string, error?: Error | unknown, extra?: Record<string, any>): void {
    const stack = error instanceof Error ? error.stack : undefined;
    const msg = error instanceof Error ? `${message}: ${error.message}` : message;
    this.log('error', module, msg, stack, extra);
  }

  /**
   * 记录致命错误日志
   */
  fatal(module: string, message: string, error?: Error | unknown, extra?: Record<string, any>): void {
    const stack = error instanceof Error ? error.stack : undefined;
    const msg = error instanceof Error ? `${message}: ${error.message}` : message;
    this.log('fatal', module, msg, stack, extra);
    // 致命错误立即上报
    this.flush();
  }

  /**
   * 通用日志记录
   */
  private log(
    level: ErrorLevel,
    module: string,
    message: string,
    stack?: string,
    extra?: Record<string, any>
  ): void {
    const entry: ErrorLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      stack,
      extra,
      platform: Platform.OS,
      appVersion: '1.0.0',
      userId: this.userId,
    };

    this.logs.push(entry);

    // 控制台输出（开发环境）
    if (__DEV__) {
      const prefix = `[${level.toUpperCase()}][${module}]`;
      switch (level) {
        case 'debug':
          console.debug(prefix, message, extra || '');
          break;
        case 'info':
          console.info(prefix, message, extra || '');
          break;
        case 'warn':
          console.warn(prefix, message, extra || '');
          break;
        case 'error':
        case 'fatal':
          console.error(prefix, message, stack || '', extra || '');
          break;
      }
    }

    // 超过最大数量时，移除最旧的日志
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }

    // 持久化到本地存储
    this.persistLogs();
  }

  /**
   * 持久化日志到本地存储
   */
  private async persistLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch {
      // 忽略存储写入错误
    }
  }

  /**
   * 批量上报日志到后端
   */
  async flush(): Promise<void> {
    if (this.logs.length === 0) return;

    const batch = this.logs.splice(0, BATCH_UPLOAD_SIZE);
    
    try {
      // 尝试上报到后端（如果后端支持）
      // 目前先记录到控制台，后续可对接后端日志收集接口
      if (__DEV__) {
        console.log(`[ErrorLogger] Flushing ${batch.length} log entries`);
      }
      
      // TODO: 对接后端日志收集API
      // await fetch('https://crm.bdsm.com.cn/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ logs: batch }),
      // });

      // 上报成功，更新本地存储
      await this.persistLogs();
    } catch {
      // 上报失败，将日志放回队列
      this.logs.unshift(...batch);
      await this.persistLogs();
    }
  }

  /**
   * 获取所有日志（用于调试）
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * 清除所有日志
   */
  async clear(): Promise<void> {
    this.logs = [];
    await AsyncStorage.removeItem(LOG_STORAGE_KEY);
  }

  /**
   * 销毁日志系统
   */
  destroy(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
    this.flush();
    this.isInitialized = false;
  }
}

// 导出单例
export const errorLogger = new ErrorLogger();
export default errorLogger;
