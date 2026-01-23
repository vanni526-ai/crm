# Android App 快速开始指南

## 🚀 5分钟快速构建

### 前置要求
- ✅ 安装Java JDK 17
- ✅ 安装Android Studio
- ✅ 安装Node.js 18+
- ✅ 安装pnpm: `npm install -g pnpm`

### 构建步骤

```bash
# 1. 进入项目目录
cd course_crm

# 2. 安装依赖
pnpm install

# 3. 构建Web应用
pnpm build

# 4. 同步到Android项目
npx cap sync android

# 5. 打开Android Studio
npx cap open android

# 6. 在Android Studio中点击"Run"按钮(绿色三角形)
```

### 生成APK文件

在Android Studio中:
1. 点击菜单 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. 等待构建完成
3. APK文件位置: `android/app/build/outputs/apk/debug/app-debug.apk`

## 📱 安装到手机

1. 将APK文件传输到手机
2. 在手机上打开文件管理器,找到APK文件
3. 点击安装

## ⚠️ 重要提示

**本应用包含后端服务,Android App只是前端部分!**

- 后端服务需要单独部署到服务器
- 确保前端代码中的API地址指向正确的后端服务器
- 不要使用localhost作为API地址

## 🔧 常见问题

**问题**: Android Studio无法找到SDK
**解决**: 在 `android/local.properties` 中设置SDK路径

**问题**: 应用安装后闪退
**解决**: 检查是否运行了 `pnpm build` 和 `npx cap sync android`

**问题**: 网络请求失败
**解决**: 检查API地址配置和网络权限

详细文档请查看 `BUILD_ANDROID.md`
