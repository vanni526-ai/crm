#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // 检查是否有未提交的更改，如果有则自动提交
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  if (gitStatus.length > 0) {
    console.log('⚠️  Detected uncommitted changes, auto-committing...');
    execSync('git add -A', { encoding: 'utf-8' });
    execSync('git commit -m "Auto-commit before version generation" --no-verify', { encoding: 'utf-8' });
    console.log('✅ Changes committed successfully');
  }
  
  // 获取Git commit hash（短版本）
  const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  
  // 获取构建时间（ISO 8601格式）
  const buildTime = new Date().toISOString();
  
  // 获取Git分支名
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  
  // 再次检查是否有未提交的更改（理论上应该为空）
  const gitStatusAfter = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  const isDirty = gitStatusAfter.length > 0;
  
  if (isDirty) {
    console.warn('⚠️  Warning: Still have uncommitted changes after auto-commit');
  }
  
  const versionData = {
    version: gitHash + (isDirty ? '-dirty' : ''),
    buildTime,
    branch: gitBranch,
    isDirty,
  };
  
  // 写入version.json到client/public目录
  const outputPath = join(__dirname, '../client/public/version.json');
  writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
  
  // 更新package.json的version字段
  const packagePath = join(__dirname, '../package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  packageJson.version = versionData.version;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('✅ Version file generated successfully:');
  console.log(JSON.stringify(versionData, null, 2));
  console.log(`✅ package.json version updated to: ${versionData.version}`);
} catch (error) {
  console.error('❌ Failed to generate version file:', error.message);
  
  // 如果Git命令失败（例如不在Git仓库中），使用时间戳作为版本号
  const fallbackVersion = {
    version: Date.now().toString(36),
    buildTime: new Date().toISOString(),
    branch: 'unknown',
    isDirty: false,
  };
  
  const outputPath = join(__dirname, '../client/public/version.json');
  writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2));
  
  console.log('⚠️  Using fallback version:');
  console.log(JSON.stringify(fallbackVersion, null, 2));
}
