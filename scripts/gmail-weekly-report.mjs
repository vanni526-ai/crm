#!/usr/bin/env node

/**
 * Gmail导入周报脚本
 * 每周一早上9点运行,统计上周的Gmail订单导入情况并发送通知
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 使用tsx运行TypeScript版本的周报脚本
try {
  console.log('执行Gmail导入周报...');
  execSync('npx tsx scripts/gmail-weekly-report.ts', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error('周报生成失败:', error.message);
  process.exit(1);
}
