# 课程交付CRM系统 - Android APK构建指南

## 📱 项目信息

- **应用名称**: 课程交付CRM系统
- **包名**: com.course.crm
- **版本**: 1.0.0
- **最低Android版本**: Android 8.0 (API 26)
- **目标Android版本**: Android 14 (API 34)

## 🔧 前置要求

### 1. 安装Android开发环境

**Windows/Mac/Linux:**
- 下载并安装 [Android Studio](https://developer.android.com/studio)
- 或者手动安装 Android SDK

**通过Android Studio安装SDK:**
1. 打开Android Studio
2. 进入 Settings → SDK Manager
3. 安装以下组件:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - Android Emulator
   - Android SDK Platform-Tools

### 2. 配置环境变量

**Windows (PowerShell):**
```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\YourUsername\AppData\Local\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:ANDROID_HOME\tools;$env:ANDROID_HOME\platform-tools", "User")
```

**Mac/Linux:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### 3. 安装Java JDK

- 下载并安装 [OpenJDK 17](https://adoptium.net/)
- 或通过包管理器: `brew install openjdk@17` (Mac) 或 `sudo apt install openjdk-17-jdk` (Linux)

### 4. 安装Gradle

- 下载 [Gradle 8.5+](https://gradle.org/releases/)
- 或通过包管理器安装

## 📦 项目准备

### 1. 获取项目文件

项目已经配置好Capacitor和Android支持,包含以下结构:
```
course_crm/
├── android/                    # Android项目
│   ├── app/
│   ├── build.gradle
│   └── gradlew
├── client/                     # React前端代码
├── server/                     # Express后端代码
├── capacitor.config.ts         # Capacitor配置
└── package.json
```

### 2. 验证项目配置

```bash
cd course_crm

# 检查Capacitor配置
cat capacitor.config.ts

# 检查Android项目配置
cat android/app/build.gradle
```

## 🔑 签名密钥配置

### 1. 生成签名密钥 (首次构建)

```bash
# 进入Android项目目录
cd android

# 使用keytool生成签名密钥
keytool -genkey -v -keystore course_crm.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias course_crm_key

# 输入信息:
# 密钥库密码: [输入强密码,例如: CoursesCRM@2025]
# 密钥密码: [与密钥库密码相同]
# 名字和姓氏: Course CRM
# 组织单位: Development
# 组织名称: Course Delivery
# 城市或地区: Shanghai
# 州或省份: Shanghai
# 国家代码: CN
```

### 2. 配置Gradle签名

在 `android/app/build.gradle` 中添加签名配置:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('course_crm.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'course_crm_key'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 🛠️ 构建APK

### 1. 准备Web资源

```bash
cd course_crm

# 构建Web应用
pnpm build

# 同步资源到Android项目
npx cap sync android
```

### 2. 构建Debug APK (测试用)

```bash
cd android

# 使用Gradle构建
./gradlew assembleDebug

# 输出文件位置:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. 构建Release APK (发布用)

```bash
cd android

# 使用Gradle构建Release版本
./gradlew assembleRelease

# 输出文件位置:
# android/app/build/outputs/apk/release/app-release.apk
```

### 4. 构建Bundle (Google Play发布)

```bash
cd android

# 构建Android App Bundle
./gradlew bundleRelease

# 输出文件位置:
# android/app/build/outputs/bundle/release/app-release.aab
```

## 📱 在真机上测试

### 1. 连接Android设备

```bash
# 启用USB调试
# 在设备上: 设置 → 开发者选项 → USB调试

# 验证连接
adb devices

# 输出应该显示:
# List of attached devices
# emulator-5554          device
# 或 real_device_id      device
```

### 2. 安装Debug APK

```bash
# 安装到连接的设备
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 或使用Gradle直接安装
cd android
./gradlew installDebug
```

### 3. 启动应用

```bash
# 启动应用
adb shell am start -n com.course.crm/.MainActivity

# 查看日志
adb logcat | grep "course_crm"
```

### 4. 调试

```bash
# 实时查看日志
adb logcat

# 查看特定标签的日志
adb logcat | grep "CRM"

# 清除日志
adb logcat -c
```

## 🎨 应用信息配置

### 1. 应用图标

将应用图标放置在:
```
android/app/src/main/res/mipmap-*/ic_launcher.png
```

支持的分辨率:
- `mipmap-ldpi/`: 36x36 px
- `mipmap-mdpi/`: 48x48 px
- `mipmap-hdpi/`: 72x72 px
- `mipmap-xhdpi/`: 96x96 px
- `mipmap-xxhdpi/`: 144x144 px
- `mipmap-xxxhdpi/`: 192x192 px

### 2. 应用名称和信息

编辑 `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version='1.0' encoding='utf-8'?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:usesCleartextTraffic="true">
        ...
    </application>
</manifest>
```

编辑 `android/app/src/main/res/values/strings.xml`:

```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">课程交付CRM</string>
    <string name="title_activity_main">课程交付CRM系统</string>
</resources>
```

### 3. 应用权限

编辑 `android/app/src/main/AndroidManifest.xml` 添加权限:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

## 📤 发布到Google Play

### 1. 创建Google Play开发者账号

- 访问 [Google Play Console](https://play.google.com/console)
- 注册开发者账号 (需要支付$25一次性费用)

### 2. 创建应用

1. 在Google Play Console中创建新应用
2. 填写应用名称、描述、分类等信息
3. 上传应用截图 (最少2张,最多8张)
4. 上传应用图标 (512x512 PNG)
5. 填写隐私政策URL

### 3. 上传APK/Bundle

1. 进入 Release → Production
2. 上传 `app-release.aab` (推荐) 或 `app-release.apk`
3. 填写发布说明
4. 审核并发布

### 4. 应用商店信息

**应用名称**: 课程交付CRM系统

**应用描述**:
```
课程交付CRM系统是一个专业的课程管理和客户关系管理平台,
帮助教育机构和培训机构高效管理课程、客户、订单和财务。

主要功能:
- 课程排课和管理
- 客户信息管理
- 订单创建和跟踪
- 老师费用管理
- 财务统计和分析
- 数据导入和导出
- Gmail邮件自动导入
- 对账和费用核算

支持多用户协作,提供完整的权限管理和数据安全保护。
```

**分类**: 商务应用

**内容分级**: 3+

**隐私政策**: [您的隐私政策URL]

## 🐛 常见问题

### 1. 构建失败: "SDK location not found"

**解决方案:**
```bash
cd android
echo "sdk.dir=/path/to/android/sdk" > local.properties
```

### 2. 构建失败: "Gradle sync failed"

**解决方案:**
```bash
cd android
./gradlew clean
./gradlew build
```

### 3. 应用启动后白屏

**解决方案:**
- 检查API服务器连接
- 查看 `adb logcat` 日志
- 确保后端服务运行正常

### 4. 应用闪退

**解决方案:**
```bash
# 查看详细错误日志
adb logcat | grep "FATAL"

# 清除应用数据后重试
adb shell pm clear com.course.crm
```

## 📋 发布检查清单

- [ ] 应用图标已准备 (512x512 PNG)
- [ ] 应用截图已准备 (最少2张)
- [ ] 应用名称和描述已填写
- [ ] 隐私政策URL已配置
- [ ] 应用权限已配置
- [ ] 签名密钥已生成
- [ ] Release APK已构建
- [ ] 真机测试通过
- [ ] 所有功能验证无误
- [ ] 应用商店信息完整

## 🚀 快速命令参考

```bash
# 构建Web应用
pnpm build

# 同步到Android
npx cap sync android

# 构建Debug APK
cd android && ./gradlew assembleDebug

# 构建Release APK
cd android && ./gradlew assembleRelease

# 构建Bundle (Google Play)
cd android && ./gradlew bundleRelease

# 安装Debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 启动应用
adb shell am start -n com.course.crm/.MainActivity

# 查看日志
adb logcat | grep "course_crm"

# 清除应用数据
adb shell pm clear com.course.crm
```

## 📞 技术支持

如有问题,请查看:
- [Capacitor文档](https://capacitorjs.com/docs)
- [Android开发文档](https://developer.android.com/docs)
- [Google Play发布指南](https://developer.android.com/distribute/play/launch)

---

**最后更新**: 2025年1月27日
**版本**: 1.0.0
