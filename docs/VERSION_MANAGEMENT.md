# 自动化版本管理系统

## 概述

本系统实现了自动化的版本号管理，无需手动修改版本号。版本号基于Git commit hash自动生成，确保每次发布都有唯一的版本标识。

## 工作原理

### 1. 版本号生成（构建时）

在每次构建时，`scripts/generate-version.mjs` 脚本会自动：
- 读取当前Git commit hash（短版本，7位）
- 记录构建时间（ISO 8601格式）
- 检测Git分支名
- 检查是否有未提交的更改（dirty标记）
- 生成 `client/public/version.json` 文件

**生成的版本文件示例：**
```json
{
  "version": "e0e2dbe",
  "buildTime": "2026-02-22T06:08:52.163Z",
  "branch": "main",
  "isDirty": false
}
```

### 2. 版本号显示（运行时）

#### 后端API
- 端点：`trpc.system.version.useQuery()`
- 返回字段：
  - `version`: Git commit hash（如有未提交更改，后缀 `-dirty`）
  - `buildTime`: 构建时间
  - `branch`: Git分支名
  - `isDirty`: 是否有未提交的更改
  - `serverTime`: 服务器当前时间

#### 前端显示
- 位置：首页标题旁边
- 显示内容：
  - **当前版本：e0e2dbe**（灰色徽章）
  - **未提交更改**（橙色标签，仅当 `isDirty=true` 时显示）

## 使用方法

### 开发环境

开发时无需手动操作，版本号会自动显示当前Git状态：
- 如果有未提交的更改，版本号会显示 `-dirty` 后缀
- 橙色标签会提示"未提交更改"

### 发布流程

1. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 新功能描述"
   ```

2. **保存检查点**
   - 在Manus管理界面点击"保存检查点"
   - 或使用 `webdev_save_checkpoint` 工具

3. **发布**
   - 点击Manus管理界面的"发布"按钮
   - 系统会自动运行构建脚本，生成新的版本号
   - 版本号基于最新的Git commit hash

4. **验证发布**
   - 访问发布后的网站首页
   - 查看"当前版本"徽章
   - 确认版本号与Git commit hash一致
   - 确认没有"未提交更改"标签

## 版本号格式说明

### 正常版本
- 格式：`e0e2dbe`
- 说明：7位Git commit hash短版本

### 开发版本（有未提交更改）
- 格式：`e0e2dbe-dirty`
- 说明：commit hash + `-dirty` 后缀
- 前端显示：额外显示橙色"未提交更改"标签

### 降级版本（Git不可用）
- 格式：时间戳的36进制表示（如 `lq3x8y9z`）
- 说明：当Git命令失败时的降级方案

## 技术实现

### 文件清单

1. **`scripts/generate-version.mjs`**
   - 版本号生成脚本
   - 在构建前自动执行

2. **`client/public/version.json`**
   - 版本信息存储文件
   - 构建时自动生成

3. **`server/_core/systemRouter.ts`**
   - 新增 `version` 端点
   - 返回版本信息和服务器时间

4. **`client/src/pages/Home.tsx`**
   - 调用 `trpc.system.version.useQuery()`
   - 显示版本号和状态标签

5. **`server/system.version.test.ts`**
   - 版本API的单元测试
   - 验证返回数据的完整性和一致性

### 构建脚本集成

**`package.json`** 中的构建脚本已更新：
```json
{
  "scripts": {
    "build": "node scripts/generate-version.mjs && vite build && esbuild ...",
    "prebuild": "node scripts/generate-version.mjs"
  }
}
```

## 常见问题

### Q: 为什么版本号显示 `-dirty`？
**A:** 表示当前代码有未提交的更改。请先提交代码再发布。

### Q: 如何查看完整的Git commit hash？
**A:** 
```bash
git rev-parse HEAD
```

### Q: 版本号可以自定义吗？
**A:** 不建议。Git commit hash是唯一且可追溯的标识。如需自定义，可修改 `scripts/generate-version.mjs`。

### Q: 发布后版本号没有更新怎么办？
**A:** 
1. 检查是否提交了代码
2. 检查构建脚本是否正常执行
3. 检查 `client/public/version.json` 是否生成
4. 清除浏览器缓存后重新访问

## 优势

1. **自动化** - 无需手动维护版本号
2. **可追溯** - 版本号直接对应Git commit，方便回溯
3. **准确性** - 避免人为错误（如忘记更新版本号）
4. **透明度** - 前端用户可清楚看到当前运行的版本
5. **开发友好** - 开发环境自动显示未提交更改状态

## 未来优化方向

1. **版本对比** - 前端对比本地构建版本和服务器运行版本，提示是否需要刷新
2. **更新通知** - 检测到新版本发布时，自动提示用户刷新页面
3. **版本历史** - 在管理界面显示历史版本列表和发布记录
4. **回滚功能** - 一键回滚到指定版本
