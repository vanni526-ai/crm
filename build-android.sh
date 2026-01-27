#!/bin/bash

# 课程交付CRM系统 - Android APK构建脚本
# 用法: ./build-android.sh [debug|release]

set -e

BUILD_TYPE=${1:-debug}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"

echo "================================"
echo "课程交付CRM系统 - Android构建"
echo "================================"
echo "构建类型: $BUILD_TYPE"
echo "项目目录: $PROJECT_DIR"
echo ""

# 检查必要的工具
echo "检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ 错误: 未找到pnpm"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ 错误: 未找到npx"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 步骤1: 构建Web应用
echo "步骤1: 构建Web应用..."
cd "$PROJECT_DIR"
pnpm build
echo "✅ Web应用构建完成"
echo ""

# 步骤2: 同步到Android
echo "步骤2: 同步资源到Android项目..."
npx cap sync android
echo "✅ 资源同步完成"
echo ""

# 步骤3: 构建APK
echo "步骤3: 构建$BUILD_TYPE APK..."
cd "$ANDROID_DIR"

if [ "$BUILD_TYPE" = "debug" ]; then
    ./gradlew assembleDebug
    APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    echo "✅ Debug APK构建完成"
elif [ "$BUILD_TYPE" = "release" ]; then
    ./gradlew assembleRelease
    APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    echo "✅ Release APK构建完成"
elif [ "$BUILD_TYPE" = "bundle" ]; then
    ./gradlew bundleRelease
    APK_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
    echo "✅ Bundle构建完成"
else
    echo "❌ 错误: 未知的构建类型 '$BUILD_TYPE'"
    echo "用法: ./build-android.sh [debug|release|bundle]"
    exit 1
fi

echo ""
echo "================================"
echo "✅ 构建成功!"
echo "================================"
echo "输出文件: $APK_PATH"
echo ""

if [ -f "$APK_PATH" ]; then
    SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "文件大小: $SIZE"
    echo ""
    echo "后续步骤:"
    if [ "$BUILD_TYPE" = "debug" ]; then
        echo "1. 连接Android设备并启用USB调试"
        echo "2. 运行: adb install $APK_PATH"
        echo "3. 在设备上启动应用"
    elif [ "$BUILD_TYPE" = "release" ]; then
        echo "1. 对APK进行签名"
        echo "2. 在真机上测试"
        echo "3. 上传到Google Play"
    elif [ "$BUILD_TYPE" = "bundle" ]; then
        echo "1. 上传到Google Play Console"
        echo "2. Google Play将自动为不同设备生成优化的APK"
    fi
else
    echo "❌ 错误: APK文件未找到"
    exit 1
fi
