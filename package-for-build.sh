#!/bin/bash

# 课程交付CRM系统 - 项目打包脚本
# 用途: 打包项目为可在本地构建的压缩包

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="/tmp/course_crm_build_$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="$PROJECT_DIR/course_crm_android_build_package.tar.gz"

echo "================================"
echo "项目打包脚本"
echo "================================"
echo "项目目录: $PROJECT_DIR"
echo "打包目录: $PACKAGE_DIR"
echo ""

# 创建打包目录
mkdir -p "$PACKAGE_DIR"
cd "$PACKAGE_DIR"

echo "正在复制项目文件..."

# 复制必要的文件和目录
cp -r "$PROJECT_DIR/android" .
cp -r "$PROJECT_DIR/client" .
cp -r "$PROJECT_DIR/server" .
cp -r "$PROJECT_DIR/drizzle" .
cp -r "$PROJECT_DIR/shared" .
cp -r "$PROJECT_DIR/storage" .

# 复制配置文件
cp "$PROJECT_DIR/package.json" .
cp "$PROJECT_DIR/pnpm-lock.yaml" .
cp "$PROJECT_DIR/tsconfig.json" .
cp "$PROJECT_DIR/vite.config.ts" .
cp "$PROJECT_DIR/capacitor.config.ts" .
cp "$PROJECT_DIR/esbuild.config.mjs" .

# 复制构建脚本
cp "$PROJECT_DIR/build-android.sh" .
cp "$PROJECT_DIR/build-android.bat" .
cp "$PROJECT_DIR/BUILD_APK_GUIDE.md" .

# 创建README
cat > README.md << 'EOF'
# 课程交付CRM系统 - Android应用构建包

## 📱 项目信息

- **应用名称**: 课程交付CRM系统
- **包名**: com.course.crm
- **版本**: 1.0.0
- **平台**: Android 8.0+ (API 26+)

## 🚀 快速开始

### 1. 前置要求

- Node.js 18+
- pnpm 8+
- Android SDK (API 34)
- Java JDK 17+
- Gradle 8.5+

### 2. 构建APK

**Linux/Mac:**
```bash
chmod +x build-android.sh
./build-android.sh debug      # 构建Debug版本
./build-android.sh release    # 构建Release版本
./build-android.sh bundle     # 构建Bundle (Google Play)
```

**Windows:**
```cmd
build-android.bat debug       # 构建Debug版本
build-android.bat release     # 构建Release版本
build-android.bat bundle      # 构建Bundle (Google Play)
```

### 3. 详细指南

请查看 `BUILD_APK_GUIDE.md` 了解完整的构建步骤和发布指南。

## 📦 项目结构

```
.
├── android/                    # Android项目
├── client/                     # React前端代码
├── server/                     # Express后端代码
├── drizzle/                    # 数据库schema
├── shared/                     # 共享代码
├── storage/                    # 存储相关代码
├── build-android.sh            # Linux/Mac构建脚本
├── build-android.bat           # Windows构建脚本
├── BUILD_APK_GUIDE.md          # 详细构建指南
├── capacitor.config.ts         # Capacitor配置
├── package.json                # 项目依赖
└── README.md                   # 本文件
```

## 🔧 环境配置

### 1. 安装Android SDK

访问 [Android Studio](https://developer.android.com/studio) 下载安装。

### 2. 配置环境变量

**Linux/Mac:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

**Windows:**
设置系统环境变量:
- `ANDROID_HOME`: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
- `PATH`: 添加 `%ANDROID_HOME%\tools` 和 `%ANDROID_HOME%\platform-tools`

### 3. 验证环境

```bash
adb --version
gradle --version
java -version
```

## 📱 测试应用

### 1. 连接设备

```bash
# 启用USB调试后连接设备
adb devices
```

### 2. 安装APK

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. 启动应用

```bash
adb shell am start -n com.course.crm/.MainActivity
```

## 📤 发布到Google Play

1. 在 [Google Play Console](https://play.google.com/console) 创建开发者账号
2. 创建新应用
3. 上传 `app-release.aab` 或 `app-release.apk`
4. 填写应用信息和截图
5. 提交审核

详见 `BUILD_APK_GUIDE.md` 中的发布部分。

## 🐛 常见问题

**Q: 构建失败"SDK location not found"**
A: 在 `android/` 目录下创建 `local.properties`:
```
sdk.dir=/path/to/android/sdk
```

**Q: 应用启动后白屏**
A: 检查后端API服务是否运行,查看 `adb logcat` 日志。

**Q: 如何签名Release APK?**
A: 详见 `BUILD_APK_GUIDE.md` 中的"签名密钥配置"部分。

## 📞 技术支持

- [Capacitor文档](https://capacitorjs.com/docs)
- [Android开发文档](https://developer.android.com/docs)
- [Google Play发布指南](https://developer.android.com/distribute/play/launch)

---

**版本**: 1.0.0
**最后更新**: 2025年1月27日
EOF

echo "✅ 文件复制完成"
echo ""

# 创建压缩包
echo "正在创建压缩包..."
cd ..
tar -czf "$OUTPUT_FILE" "course_crm_build_$(date +%Y%m%d_%H%M%S)"

echo "✅ 压缩包创建完成"
echo ""
echo "================================"
echo "✅ 打包完成!"
echo "================================"
echo "输出文件: $OUTPUT_FILE"
echo ""

# 显示文件大小
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "文件大小: $SIZE"
echo ""
echo "后续步骤:"
echo "1. 下载压缩包"
echo "2. 解压到本地"
echo "3. 按照BUILD_APK_GUIDE.md的说明构建APK"

# 清理临时目录
rm -rf "$PACKAGE_DIR"
