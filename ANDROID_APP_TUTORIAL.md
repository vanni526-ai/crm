# 课程交付CRM系统 - Android App完整构建教程

**作者**: Manus AI  
**更新日期**: 2026年1月23日  
**适用对象**: 具备基础计算机操作能力的用户  
**预计时间**: 60-90分钟(首次构建)

---

## 📋 目录

1. [教程概述](#教程概述)
2. [准备工作](#准备工作)
3. [环境配置](#环境配置)
4. [项目解压与依赖安装](#项目解压与依赖安装)
5. [环境变量配置](#环境变量配置)
6. [构建Web应用](#构建web应用)
7. [同步到Android项目](#同步到android项目)
8. [使用Android Studio构建APK](#使用android-studio构建apk)
9. [安装和测试](#安装和测试)
10. [常见问题解决](#常见问题解决)
11. [进阶配置](#进阶配置)

---

## 教程概述

本教程将指导您完成以下工作:

**目标**: 将课程交付CRM Web应用打包成可以在Android手机上安装使用的APK文件。

**技术方案**: 使用Capacitor框架将Web应用封装成原生Android应用。Capacitor是一个现代化的跨平台应用运行时,可以让Web应用以原生应用的形式在移动设备上运行。

**最终产物**: 一个可以在Android 5.1及以上系统安装的APK安装包,用户可以像使用普通App一样使用课程交付CRM系统。

**重要提示**: 
- 本应用包含前端和后端两部分,Android App只包含前端界面
- 后端服务需要单独部署到服务器上
- App需要通过网络连接后端API才能正常工作

---

## 准备工作

### 硬件要求

**电脑配置**:
- 操作系统: Windows 10/11、macOS 10.14+、或 Ubuntu 18.04+
- 处理器: Intel i5或同等性能以上
- 内存: 8GB RAM(推荐16GB)
- 硬盘: 至少20GB可用空间(用于Android SDK和项目文件)
- 网络: 稳定的互联网连接(用于下载依赖包)

**Android设备**:
- Android 5.1 (API Level 22)或更高版本
- 至少100MB可用存储空间
- 可以通过USB连接电脑,或使用Android模拟器

### 需要下载的软件

在开始之前,请准备好以下软件的安装包:

| 软件名称 | 版本要求 | 下载地址 | 用途 |
|---------|---------|---------|------|
| Java JDK | 17 | https://adoptium.net/ | Android开发必需的Java环境 |
| Android Studio | 最新稳定版 | https://developer.android.com/studio | Android应用开发IDE |
| Node.js | 18.x 或 20.x LTS | https://nodejs.org/ | JavaScript运行环境 |
| Git | 最新版 | https://git-scm.com/ | 版本控制工具(可选) |

### 时间预估

| 步骤 | 首次执行 | 后续执行 |
|-----|---------|---------|
| 软件下载与安装 | 30-60分钟 | - |
| 环境配置 | 10-20分钟 | - |
| 项目构建 | 20-30分钟 | 5-10分钟 |
| APK生成 | 10-20分钟 | 5-10分钟 |
| **总计** | **70-130分钟** | **10-20分钟** |

---

## 环境配置

### 第一步: 安装Java JDK 17

Java Development Kit是Android开发的基础环境。

#### Windows系统

1. 访问 https://adoptium.net/ 下载Eclipse Temurin JDK 17
2. 选择 **Windows x64** 版本的 **.msi** 安装包
3. 双击安装包,按照向导完成安装
4. 安装时勾选 **"Set JAVA_HOME variable"** 和 **"Add to PATH"**

**验证安装**:

打开命令提示符(Win+R,输入`cmd`),执行:

```cmd
java -version
```

应该看到类似输出:
```
openjdk version "17.0.x" 2024-xx-xx
OpenJDK Runtime Environment Temurin-17.0.x
```

#### macOS系统

1. 访问 https://adoptium.net/ 下载Eclipse Temurin JDK 17
2. 选择 **macOS** 版本的 **.pkg** 安装包
3. 双击安装包,按照向导完成安装

**配置环境变量**:

打开终端,编辑 `~/.zshrc` 或 `~/.bash_profile`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH=$JAVA_HOME/bin:$PATH
```

保存后执行 `source ~/.zshrc` 使配置生效。

**验证安装**:

```bash
java -version
```

#### Linux系统

使用包管理器安装:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk

# 配置环境变量
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# 验证安装
java -version
```

---

### 第二步: 安装Android Studio

Android Studio是Google官方的Android开发工具,包含了构建Android应用所需的所有工具。

#### 下载与安装

1. 访问 https://developer.android.com/studio
2. 点击 **"Download Android Studio"** 下载最新版本
3. 运行安装程序,选择 **"Standard"** 安装类型
4. 安装过程会自动下载Android SDK、Android SDK Platform和Android Virtual Device

**安装组件清单**:
- Android SDK
- Android SDK Platform (API Level 34)
- Android SDK Build-Tools
- Android Emulator
- Android SDK Platform-Tools

#### 首次启动配置

1. 启动Android Studio
2. 在欢迎界面,点击 **"More Actions"** → **"SDK Manager"**
3. 在 **"SDK Platforms"** 标签页,确保已安装:
   - Android 14.0 (API Level 34) ✓
   - Android 5.1 (API Level 22) ✓ (最低支持版本)

4. 在 **"SDK Tools"** 标签页,确保已安装:
   - Android SDK Build-Tools ✓
   - Android Emulator ✓
   - Android SDK Platform-Tools ✓
   - Google Play services ✓

#### 配置环境变量

**Windows系统**:

1. 右键 **"此电脑"** → **"属性"** → **"高级系统设置"** → **"环境变量"**
2. 在 **"系统变量"** 中点击 **"新建"**:
   - 变量名: `ANDROID_HOME`
   - 变量值: `C:\Users\你的用户名\AppData\Local\Android\Sdk`

3. 编辑 **"Path"** 变量,添加:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`

**macOS/Linux系统**:

编辑 `~/.zshrc` 或 `~/.bashrc`:

```bash
# macOS
export ANDROID_HOME=$HOME/Library/Android/sdk

# Linux
export ANDROID_HOME=$HOME/Android/Sdk

# 通用
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/emulator
```

保存后执行 `source ~/.zshrc` 使配置生效。

**验证配置**:

```bash
# 检查adb工具是否可用
adb version

# 应该看到类似输出:
# Android Debug Bridge version 1.0.41
```

---

### 第三步: 安装Node.js和pnpm

Node.js是JavaScript运行环境,pnpm是高效的包管理器。

#### 安装Node.js

1. 访问 https://nodejs.org/
2. 下载 **LTS(长期支持)** 版本(推荐18.x或20.x)
3. 运行安装程序,使用默认设置完成安装

**验证安装**:

```bash
node -v
# 应输出: v18.x.x 或 v20.x.x

npm -v
# 应输出: 9.x.x 或 10.x.x
```

#### 安装pnpm

pnpm是一个快速、节省磁盘空间的包管理器。

```bash
npm install -g pnpm
```

**验证安装**:

```bash
pnpm -v
# 应输出: 8.x.x 或更高版本
```

---

## 项目解压与依赖安装

### 第一步: 解压项目文件

1. 将 `course_crm_android.tar.gz` 复制到一个合适的位置(建议路径不包含中文和空格)
2. 解压文件:

**Windows系统**:
- 使用7-Zip或WinRAR解压
- 或使用Git Bash执行: `tar -xzf course_crm_android.tar.gz`

**macOS/Linux系统**:
```bash
tar -xzf course_crm_android.tar.gz
```

解压后会得到 `course_crm` 目录,包含完整的项目文件。

### 第二步: 进入项目目录

```bash
cd course_crm
```

### 第三步: 查看项目结构

```bash
ls -la
```

您应该看到以下主要目录和文件:

```
course_crm/
├── android/              # Android原生项目
├── client/               # Web前端源码
├── server/               # 后端服务源码
├── drizzle/              # 数据库Schema
├── shared/               # 共享代码
├── capacitor.config.ts   # Capacitor配置
├── package.json          # 项目依赖
├── BUILD_ANDROID.md      # 构建指南
├── QUICK_START_ANDROID.md
├── ENV_CONFIG.md
└── PACKAGE_CONTENTS.md
```

### 第四步: 安装项目依赖

这一步会下载项目所需的所有Node.js包,可能需要5-15分钟。

```bash
pnpm install
```

**安装过程说明**:

安装过程中您会看到进度条和日志输出:

```
Packages: +1234
++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 1234, reused 1200, downloaded 34
```

**常见问题**:

如果遇到网络超时错误,可以配置国内镜像:

```bash
# 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 重新安装
pnpm install
```

**验证安装**:

安装完成后,检查 `node_modules` 目录是否存在:

```bash
ls node_modules | wc -l
# 应该显示几百到上千个包
```

---

## 环境变量配置

在构建Android App之前,需要配置后端API地址和其他必要的环境变量。

### 重要概念说明

**前端与后端分离**: 课程交付CRM系统采用前后端分离架构:
- **前端**(Android App): 用户界面,运行在手机上
- **后端**(API服务): 业务逻辑和数据库,运行在服务器上
- **通信方式**: 前端通过HTTP/HTTPS请求访问后端API

因此,Android App需要知道后端服务器的地址才能正常工作。

### 配置方法

#### 方法一: 使用.env文件(推荐)

在项目根目录创建 `.env` 文件:

```bash
# Windows
notepad .env

# macOS/Linux
nano .env
```

添加以下内容(根据实际情况修改):

```bash
# 后端API地址(必需)
VITE_API_BASE_URL=https://your-backend-server.com

# 应用配置
VITE_APP_TITLE=课程交付CRM系统
VITE_APP_LOGO=https://your-domain.com/logo.png

# 数据库配置(后端部署时需要)
DATABASE_URL=mysql://username:password@host:3306/course_crm

# JWT密钥(后端部署时需要)
JWT_SECRET=your-super-secret-key-change-this

# OAuth配置(如果使用Manus OAuth)
OAUTH_SERVER_URL=https://api.manus.im
VITE_APP_ID=your-app-id
VITE_OAUTH_PORTAL_URL=https://login.manus.im
```

**关键配置说明**:

| 变量名 | 说明 | 示例值 |
|-------|------|--------|
| `VITE_API_BASE_URL` | 后端API服务器地址 | `https://api.example.com` |
| `VITE_APP_TITLE` | 应用显示名称 | `课程交付CRM系统` |
| `DATABASE_URL` | 数据库连接字符串(后端) | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | 会话加密密钥(后端) | 随机字符串,至少32字符 |

**注意事项**:
- `.env` 文件不应提交到Git仓库(已在`.gitignore`中配置)
- `VITE_` 前缀的变量会被打包到前端代码中
- 不要在前端变量中存储敏感信息(如数据库密码)

#### 方法二: 修改源码(不推荐)

如果不想使用`.env`文件,可以直接修改源码:

编辑 `client/src/lib/trpc.ts`:

```typescript
// 找到这一行
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// 修改为
const baseUrl = 'https://your-backend-server.com';
```

**缺点**: 每次更换后端地址都需要重新构建App。

### 后端部署说明

Android App只是前端界面,您还需要部署后端服务。后端部署步骤:

1. 准备一台服务器(云服务器或VPS)
2. 安装Node.js、MySQL/TiDB数据库
3. 上传项目代码到服务器
4. 配置环境变量(数据库连接、JWT密钥等)
5. 运行数据库迁移: `pnpm db:push`
6. 启动后端服务: `pnpm start`
7. 配置Nginx反向代理和HTTPS证书

**简化方案**: 如果后端仍在Manus平台运行,可以直接使用Manus提供的URL作为`VITE_API_BASE_URL`。

---

## 构建Web应用

### 第一步: 执行构建命令

在项目根目录执行:

```bash
pnpm build
```

**构建过程说明**:

这个命令会执行以下操作:

1. **清理旧的构建文件**: 删除 `dist/` 目录
2. **编译TypeScript代码**: 将`.ts`文件编译为`.js`
3. **打包前端资源**: 使用Vite打包React应用
4. **优化资源**: 压缩JavaScript、CSS,优化图片
5. **生成静态文件**: 输出到 `dist/public/` 目录

**构建日志示例**:

```
> course_crm@1.0.0 build
> vite build && tsc --project tsconfig.server.json

vite v5.x.x building for production...
✓ 1234 modules transformed.
dist/public/index.html                   0.50 kB │ gzip: 0.32 kB
dist/public/assets/index-abc123.css     45.67 kB │ gzip: 12.34 kB
dist/public/assets/index-def456.js     234.56 kB │ gzip: 78.90 kB
✓ built in 12.34s
```

**构建时间**: 首次构建约10-30秒,后续构建更快。

### 第二步: 验证构建结果

检查 `dist/public/` 目录是否生成:

```bash
ls -la dist/public/
```

应该看到:

```
dist/public/
├── index.html          # 主HTML文件
├── assets/             # 打包后的JS、CSS文件
│   ├── index-xxx.js
│   ├── index-xxx.css
│   └── ...
└── vite.svg            # 静态资源
```

**关键文件说明**:

- `index.html`: 应用入口,包含根元素和资源引用
- `assets/index-xxx.js`: 打包后的JavaScript代码(包含所有React组件和业务逻辑)
- `assets/index-xxx.css`: 打包后的样式文件(包含TailwindCSS和自定义样式)

### 第三步: 本地预览(可选)

如果想在浏览器中预览构建结果:

```bash
pnpm preview
```

然后在浏览器中访问显示的URL(通常是 `http://localhost:4173`)。

按 `Ctrl+C` 停止预览服务器。

---

## 同步到Android项目

### 第一步: 执行同步命令

Capacitor的sync命令会将Web资源复制到Android项目中:

```bash
npx cap sync android
```

**同步过程说明**:

这个命令会执行以下操作:

1. **复制Web资源**: 将 `dist/public/` 中的文件复制到 `android/app/src/main/assets/public/`
2. **生成配置文件**: 创建 `capacitor.config.json` 到Android项目中
3. **更新Capacitor插件**: 同步所有已安装的Capacitor插件到Android项目
4. **更新Gradle依赖**: 更新Android项目的依赖配置

**同步日志示例**:

```
✔ Copying web assets from dist/public to android/app/src/main/assets/public in 29.78ms
✔ Creating capacitor.config.json in android/app/src/main/assets in 1.28ms
✔ copy android in 119.71ms
✔ Updating Android plugins in 32.91ms
✔ update android in 131.91ms
[info] Sync finished in 0.6s
```

### 第二步: 验证同步结果

检查Android项目中的Web资源:

```bash
ls -la android/app/src/main/assets/public/
```

应该看到与 `dist/public/` 相同的文件结构。

### 第三步: 检查Capacitor配置

查看 `capacitor.config.ts` 文件:

```bash
cat capacitor.config.ts
```

确认配置正确:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.course.crm',           // 应用包名
  appName: '课程交付CRM',             // 应用名称
  webDir: 'dist/public',             // Web资源目录
  server: {
    // 开发模式配置(生产环境应注释掉)
    // url: 'http://192.168.1.100:3000',
    // cleartext: true
  },
  android: {
    allowMixedContent: true,         // 允许HTTP+HTTPS混合内容
    webContentsDebuggingEnabled: true // 允许WebView调试
  }
};

export default config;
```

**配置说明**:

- `appId`: Android应用的唯一标识符,格式为反向域名(如`com.company.app`)
- `appName`: 应用在手机上显示的名称
- `webDir`: Web资源的相对路径
- `server.url`: 开发模式下可以指向本地开发服务器,生产环境应注释掉
- `allowMixedContent`: 如果后端使用HTTP(非HTTPS),需要设置为true

---

## 使用Android Studio构建APK

### 第一步: 打开Android项目

#### 方法一: 使用命令行(推荐)

```bash
npx cap open android
```

这个命令会自动启动Android Studio并打开项目。

#### 方法二: 手动打开

1. 启动Android Studio
2. 点击 **"Open"** 或 **"Open an Existing Project"**
3. 导航到 `course_crm/android` 目录
4. 点击 **"OK"**

### 第二步: 等待Gradle同步

**首次打开项目时的处理**:

Android Studio会自动执行Gradle同步,这个过程可能需要10-30分钟(首次),主要时间花在:

1. 下载Gradle wrapper
2. 下载Android Gradle Plugin
3. 下载项目依赖库
4. 构建项目索引

**Gradle同步界面**:

在Android Studio底部可以看到同步进度:

```
Gradle sync in progress...
Downloading https://services.gradle.org/distributions/gradle-8.x-bin.zip
[====================] 100%
```

**加速Gradle同步**:

如果下载速度慢,可以配置国内镜像。编辑 `android/build.gradle`:

```gradle
buildscript {
    repositories {
        // 添加阿里云镜像
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/public' }
        google()
        mavenCentral()
    }
}

allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/public' }
        google()
        mavenCentral()
    }
}
```

保存后,点击 **"Sync Now"** 重新同步。

### 第三步: 检查项目配置

在Android Studio中检查以下配置:

#### 1. 检查SDK版本

打开 `android/app/build.gradle`,确认:

```gradle
android {
    compileSdk 34
    
    defaultConfig {
        applicationId "com.course.crm"
        minSdk 22        // 最低支持Android 5.1
        targetSdk 34     // 目标Android 14
        versionCode 1
        versionName "1.0.0"
    }
}
```

#### 2. 检查应用信息

打开 `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">课程交付CRM</string>
    <string name="title_activity_main">课程交付CRM</string>
    <string name="package_name">com.course.crm</string>
</resources>
```

#### 3. 检查权限配置

打开 `android/app/src/main/AndroidManifest.xml`,确认包含必要权限:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 第四步: 构建Debug APK

Debug APK用于测试,签名使用Android默认的debug密钥。

#### 使用菜单构建

1. 在Android Studio顶部菜单,点击 **"Build"**
2. 选择 **"Build Bundle(s) / APK(s)"**
3. 点击 **"Build APK(s)"**

#### 构建过程

构建过程会显示在底部的 **"Build"** 窗口:

```
> Task :app:preBuild
> Task :app:compileDebugJavaWithJavac
> Task :app:mergeDebugResources
> Task :app:processDebugManifest
> Task :app:packageDebug
> Task :app:assembleDebug

BUILD SUCCESSFUL in 1m 23s
```

**首次构建时间**: 约5-15分钟  
**后续构建时间**: 约1-3分钟

#### 定位APK文件

构建完成后,Android Studio会显示通知:

```
APK(s) generated successfully for 1 module:
Module 'app': locate or analyze the APK.
```

点击 **"locate"** 链接,会打开文件管理器,显示APK文件位置:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

**APK文件信息**:
- 文件名: `app-debug.apk`
- 大小: 约5-15MB(取决于Web应用大小)
- 签名: Android debug签名(仅用于测试)

### 第五步: 构建Release APK(可选)

Release APK用于正式发布,需要使用自己的签名密钥。

#### 生成签名密钥

使用Java的keytool工具生成密钥库:

```bash
keytool -genkey -v -keystore course-crm.keystore \
  -alias course-crm \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**交互式问答**:

```
Enter keystore password: [输入密码,至少6位]
Re-enter new password: [再次输入密码]
What is your first and last name?
  [Unknown]:  Zhang San
What is the name of your organizational unit?
  [Unknown]:  IT Department
What is the name of your organization?
  [Unknown]:  Your Company
What is the name of your City or Locality?
  [Unknown]:  Shanghai
What is the name of your State or Province?
  [Unknown]:  Shanghai
What is the two-letter country code for this unit?
  [Unknown]:  CN
Is CN=Zhang San, OU=IT Department, O=Your Company,
L=Shanghai, ST=Shanghai, C=CN correct?
  [no]:  yes

Enter key password for <course-crm>
  (RETURN if same as keystore password): [直接回车]
```

生成的 `course-crm.keystore` 文件应妥善保管,**不要泄露或丢失**。

#### 配置签名

编辑 `android/app/build.gradle`,添加签名配置:

```gradle
android {
    ...
    
    signingConfigs {
        release {
            storeFile file("../../course-crm.keystore")
            storePassword "你的密码"
            keyAlias "course-crm"
            keyPassword "你的密码"
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**安全提示**: 不要将密码直接写在代码中,应该使用环境变量或gradle.properties文件。

#### 构建Release APK

1. 在Android Studio顶部菜单,点击 **"Build"**
2. 选择 **"Generate Signed Bundle / APK..."**
3. 选择 **"APK"**,点击 **"Next"**
4. 选择密钥库文件,输入密码,点击 **"Next"**
5. 选择 **"release"** 构建类型,点击 **"Finish"**

Release APK位置:

```
android/app/build/outputs/apk/release/app-release.apk
```

**Release APK与Debug APK的区别**:

| 特性 | Debug APK | Release APK |
|-----|-----------|-------------|
| 签名 | Android默认debug签名 | 自定义签名 |
| 可调试 | 是 | 否 |
| 代码优化 | 否 | 是(如果启用ProGuard) |
| 文件大小 | 较大 | 较小(如果启用代码压缩) |
| 用途 | 开发测试 | 正式发布 |

---

## 安装和测试

### 方法一: 使用USB连接真机安装

#### 准备工作

1. **启用开发者选项**:
   - 打开手机 **"设置"** → **"关于手机"**
   - 连续点击 **"版本号"** 7次
   - 提示 **"您已处于开发者模式"**

2. **启用USB调试**:
   - 打开 **"设置"** → **"系统"** → **"开发者选项"**
   - 开启 **"USB调试"**
   - 开启 **"USB安装"**(部分手机需要)

3. **连接手机**:
   - 使用USB线连接手机和电脑
   - 手机上会弹出 **"允许USB调试?"** 对话框
   - 勾选 **"始终允许使用这台计算机进行调试"**
   - 点击 **"确定"**

#### 验证连接

在命令行执行:

```bash
adb devices
```

应该看到:

```
List of devices attached
ABC123456789    device
```

如果显示 `unauthorized`,说明手机上未授权,需要重新插拔USB并授权。

#### 在Android Studio中运行

1. 在Android Studio顶部工具栏,点击设备选择下拉框
2. 选择你的手机设备(显示为设备型号)
3. 点击绿色的 **"Run"** 按钮(▶️)

应用会自动安装到手机并启动。

#### 使用命令行安装

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

安装成功后,在手机应用列表中找到 **"课程交付CRM"** 图标,点击启动。

### 方法二: 使用Android模拟器

#### 创建虚拟设备

1. 在Android Studio中,点击 **"Tools"** → **"Device Manager"**
2. 点击 **"Create Device"**
3. 选择设备型号(推荐 **"Pixel 5"**)
4. 点击 **"Next"**
5. 选择系统镜像(推荐 **"Android 11"** 或更高)
6. 如果系统镜像未下载,点击 **"Download"** 下载(约1-2GB)
7. 点击 **"Next"**,然后 **"Finish"**

#### 启动模拟器

1. 在 **"Device Manager"** 中,找到刚创建的虚拟设备
2. 点击 **"▶️"** 启动模拟器
3. 等待模拟器启动完成(首次启动约1-3分钟)

#### 在模拟器中运行应用

1. 确保模拟器已启动
2. 在Android Studio顶部工具栏,选择模拟器设备
3. 点击 **"Run"** 按钮

应用会自动安装到模拟器并启动。

### 方法三: 手动安装APK文件

#### 传输APK到手机

**使用USB传输**:
1. 连接手机到电脑
2. 在电脑上打开手机存储
3. 将 `app-debug.apk` 复制到手机的 **"Download"** 文件夹

**使用云盘传输**:
1. 将APK上传到网盘(如百度网盘、阿里云盘)
2. 在手机上下载APK文件

**使用微信/QQ传输**:
1. 将APK发送到 **"文件传输助手"** 或QQ **"我的电脑"**
2. 在手机上接收文件

#### 安装APK

1. 在手机上打开 **"文件管理器"**
2. 找到 `app-debug.apk` 文件
3. 点击文件,系统会提示 **"是否安装此应用?"**
4. 如果提示 **"不允许安装未知来源应用"**:
   - 点击 **"设置"**
   - 开启 **"允许安装未知应用"**
   - 返回继续安装
5. 点击 **"安装"**
6. 安装完成后,点击 **"打开"**

### 测试应用功能

#### 基础功能测试

1. **启动测试**:
   - 应用能否正常启动?
   - 是否显示登录界面或主界面?

2. **网络连接测试**:
   - 应用能否连接到后端API?
   - 是否显示 **"网络错误"** 或 **"连接超时"**?

3. **界面测试**:
   - 界面是否正常显示?
   - 按钮、表单是否可以正常操作?
   - 滚动是否流畅?

4. **功能测试**:
   - 登录功能是否正常?
   - 订单管理、客户管理等功能是否可用?
   - 数据是否正确显示?

#### 调试网络问题

如果应用无法连接后端,检查:

1. **后端服务是否运行**:
   - 在浏览器中访问后端API地址
   - 应该看到API响应或欢迎页面

2. **手机网络是否正常**:
   - 打开浏览器访问其他网站
   - 确认手机已连接WiFi或移动网络

3. **API地址是否正确**:
   - 检查 `.env` 文件中的 `VITE_API_BASE_URL`
   - 确认地址格式正确(包含 `http://` 或 `https://`)

4. **CORS配置是否正确**:
   - 后端需要允许来自Android App的跨域请求
   - 检查后端CORS配置

#### 使用Chrome DevTools调试

Android App的WebView可以使用Chrome开发者工具调试:

1. 在手机上启动应用
2. 在电脑Chrome浏览器中访问: `chrome://inspect`
3. 在 **"Remote Target"** 部分找到 **"课程交付CRM"**
4. 点击 **"inspect"** 打开开发者工具
5. 可以查看Console日志、Network请求、Elements等

这对于调试JavaScript错误和网络问题非常有用。

---

## 常见问题解决

### 问题1: Gradle同步失败

**错误信息**:
```
Could not resolve all files for configuration ':classpath'.
Could not download gradle-x.x.x.jar
```

**原因**: 网络问题导致无法下载Gradle或依赖包。

**解决方法**:

1. **配置国内镜像**(见前文"加速Gradle同步"部分)

2. **使用VPN或代理**:
   - 如果有VPN,开启后重新同步
   - 在Android Studio中配置HTTP代理:
     - **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **HTTP Proxy**
     - 选择 **"Manual proxy configuration"**
     - 输入代理服务器地址和端口

3. **手动下载Gradle**:
   - 访问 https://services.gradle.org/distributions/
   - 下载对应版本的 `gradle-x.x-all.zip`
   - 将文件放到 `~/.gradle/wrapper/dists/gradle-x.x-all/` 目录
   - 重新同步

### 问题2: SDK location not found

**错误信息**:
```
SDK location not found. Define location with an ANDROID_HOME environment variable
or by setting the sdk.dir path in your project's local properties file
```

**原因**: Android Studio无法找到Android SDK路径。

**解决方法**:

在 `android/local.properties` 文件中设置SDK路径:

**Windows**:
```properties
sdk.dir=C\:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk
```

**macOS**:
```properties
sdk.dir=/Users/你的用户名/Library/Android/sdk
```

**Linux**:
```properties
sdk.dir=/home/你的用户名/Android/Sdk
```

如果文件不存在,手动创建。

### 问题3: 应用安装后闪退

**原因**: Web资源未正确打包或后端API地址配置错误。

**解决方法**:

1. **检查构建流程**:
   ```bash
   # 重新构建
   pnpm build
   
   # 重新同步
   npx cap sync android
   
   # 重新构建APK
   ```

2. **查看崩溃日志**:
   ```bash
   adb logcat | grep -i "chromium"
   ```
   
   查找错误信息,通常会显示JavaScript错误或网络错误。

3. **检查Web资源**:
   ```bash
   ls android/app/src/main/assets/public/
   ```
   
   确认 `index.html` 和 `assets/` 目录存在。

4. **检查API配置**:
   - 打开 `.env` 文件
   - 确认 `VITE_API_BASE_URL` 配置正确
   - 重新构建应用

### 问题4: 网络请求失败

**错误信息**: 应用中显示 **"网络错误"** 或 **"无法连接到服务器"**

**原因**: 
- 后端服务未运行
- API地址配置错误
- CORS配置问题
- 使用HTTP而非HTTPS

**解决方法**:

1. **验证后端服务**:
   - 在手机浏览器中访问API地址
   - 应该能看到响应或欢迎页面

2. **检查CORS配置**:
   
   后端需要允许来自Android App的请求。在后端代码中添加CORS配置:
   
   ```javascript
   // Express示例
   app.use(cors({
     origin: '*',  // 生产环境应限制为特定域名
     credentials: true
   }));
   ```

3. **允许HTTP请求**(如果后端使用HTTP):
   
   编辑 `android/app/src/main/AndroidManifest.xml`:
   
   ```xml
   <application
       android:usesCleartextTraffic="true"
       ...>
   ```
   
   **安全提示**: 生产环境应使用HTTPS。

4. **检查网络权限**:
   
   确认 `AndroidManifest.xml` 包含:
   
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

### 问题5: 应用显示空白页面

**原因**: Web资源加载失败或路径配置错误。

**解决方法**:

1. **检查Capacitor配置**:
   
   打开 `capacitor.config.ts`,确认:
   
   ```typescript
   webDir: 'dist/public',  // 路径正确
   ```

2. **检查index.html**:
   
   打开 `dist/public/index.html`,确认资源路径正确:
   
   ```html
   <script type="module" src="/assets/index-xxx.js"></script>
   ```
   
   路径应该以 `/` 开头(绝对路径)。

3. **使用Chrome DevTools调试**:
   
   连接手机,在Chrome中访问 `chrome://inspect`,查看Console错误。

4. **清理并重建**:
   
   ```bash
   # 清理构建
   rm -rf dist android/app/src/main/assets/public
   
   # 重新构建
   pnpm build
   npx cap sync android
   ```

### 问题6: Java版本不兼容

**错误信息**:
```
Unsupported class file major version 61
```

**原因**: Gradle需要Java 17,但系统使用了其他版本。

**解决方法**:

1. **检查Java版本**:
   ```bash
   java -version
   ```

2. **安装Java 17**(见前文"安装Java JDK 17"部分)

3. **在Android Studio中设置Java版本**:
   - **File** → **Settings** → **Build, Execution, Deployment** → **Build Tools** → **Gradle**
   - **Gradle JDK**: 选择 **"17"**

### 问题7: 依赖包安装失败

**错误信息**:
```
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/xxx: Not Found - 404
```

**原因**: 包不存在或网络问题。

**解决方法**:

1. **清理缓存**:
   ```bash
   pnpm store prune
   rm -rf node_modules
   ```

2. **重新安装**:
   ```bash
   pnpm install
   ```

3. **使用国内镜像**:
   ```bash
   pnpm config set registry https://registry.npmmirror.com
   pnpm install
   ```

---

## 进阶配置

### 自定义应用图标

Android应用图标需要提供多种尺寸,以适配不同分辨率的设备。

#### 准备图标文件

准备一张 **1024x1024** 的PNG图片作为原始图标。

#### 生成多尺寸图标

**方法一: 使用在线工具**

访问 https://icon.kitchen/ 或 https://romannurik.github.io/AndroidAssetStudio/

1. 上传1024x1024的图标
2. 调整样式、背景色等
3. 下载生成的图标包
4. 解压后将文件复制到对应目录

**方法二: 使用Android Studio**

1. 在Android Studio中,右键 `android/app/src/main/res`
2. 选择 **"New"** → **"Image Asset"**
3. 选择 **"Launcher Icons (Adaptive and Legacy)"**
4. 上传图标文件
5. 调整前景、背景
6. 点击 **"Next"** → **"Finish"**

#### 替换图标文件

手动替换以下目录中的图标:

```
android/app/src/main/res/
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

### 自定义启动画面(Splash Screen)

启动画面在应用启动时显示,提升用户体验。

#### 创建启动画面图片

准备一张 **1080x1920** 的PNG图片(或其他常见分辨率)。

#### 配置启动画面

1. 将图片命名为 `splash.png`,放到 `android/app/src/main/res/drawable/` 目录

2. 编辑 `android/app/src/main/res/values/styles.xml`:

```xml
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
```

3. 编辑 `android/app/src/main/AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    ...>
```

### 修改应用包名

应用包名是应用的唯一标识符,格式为反向域名。

#### 修改步骤

1. **修改Capacitor配置**:
   
   编辑 `capacitor.config.ts`:
   
   ```typescript
   appId: 'com.yourcompany.coursecrm',  // 修改为你的包名
   ```

2. **修改Android配置**:
   
   编辑 `android/app/build.gradle`:
   
   ```gradle
   defaultConfig {
       applicationId "com.yourcompany.coursecrm"  // 修改为你的包名
   }
   ```

3. **修改strings.xml**:
   
   编辑 `android/app/src/main/res/values/strings.xml`:
   
   ```xml
   <string name="package_name">com.yourcompany.coursecrm</string>
   ```

4. **重命名Java包**:
   
   在Android Studio中:
   - 右键 `android/app/src/main/java/com/course/crm` 目录
   - 选择 **"Refactor"** → **"Rename"**
   - 输入新的包名
   - 选择 **"Rename package"**

5. **重新同步**:
   
   ```bash
   npx cap sync android
   ```

### 配置应用版本

应用版本包括版本号(versionCode)和版本名称(versionName)。

编辑 `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 1          // 整数,每次发布递增
    versionName "1.0.0"    // 字符串,显示给用户
}
```

**版本号规则**:
- `versionCode`: 整数,用于系统判断版本新旧,必须递增
- `versionName`: 字符串,显示给用户,建议使用语义化版本(如1.0.0)

### 启用代码混淆(ProGuard)

代码混淆可以减小APK体积,提高安全性。

编辑 `android/app/build.gradle`:

```gradle
buildTypes {
    release {
        minifyEnabled true  // 启用代码压缩
        shrinkResources true  // 启用资源压缩
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

**注意**: 启用混淆后,首次构建时间会增加,且可能导致某些功能异常,需要充分测试。

### 配置多渠道打包

如果需要为不同渠道(如应用商店、官网下载)打包不同的APK:

编辑 `android/app/build.gradle`:

```gradle
android {
    flavorDimensions "version"
    
    productFlavors {
        googleplay {
            dimension "version"
            applicationIdSuffix ".googleplay"
            versionNameSuffix "-googleplay"
        }
        
        website {
            dimension "version"
            applicationIdSuffix ".website"
            versionNameSuffix "-website"
        }
    }
}
```

构建时选择对应的flavor:

```bash
./gradlew assembleGoogleplayRelease
./gradlew assembleWebsiteRelease
```

---

## 总结

通过本教程,您已经学会了:

1. ✅ 配置Android开发环境(Java JDK、Android Studio、Node.js)
2. ✅ 解压项目并安装依赖
3. ✅ 配置环境变量和API地址
4. ✅ 构建Web应用并同步到Android项目
5. ✅ 使用Android Studio构建APK
6. ✅ 安装和测试应用
7. ✅ 解决常见问题
8. ✅ 进行进阶配置(自定义图标、启动画面等)

### 完整流程回顾

```bash
# 1. 解压项目
tar -xzf course_crm_android.tar.gz
cd course_crm

# 2. 安装依赖
pnpm install

# 3. 配置环境变量(创建.env文件)
# VITE_API_BASE_URL=https://your-backend-server.com

# 4. 构建Web应用
pnpm build

# 5. 同步到Android项目
npx cap sync android

# 6. 打开Android Studio
npx cap open android

# 7. 在Android Studio中构建APK
# Build → Build APK(s)

# 8. 安装APK到手机
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 下一步建议

完成基础构建后,您可以考虑:

1. **部署后端服务**: 将后端API部署到云服务器,确保Android App可以访问

2. **申请HTTPS证书**: 使用Let's Encrypt等服务为后端API配置HTTPS,提高安全性

3. **优化应用性能**: 
   - 启用代码混淆和资源压缩
   - 优化图片和资源文件
   - 实现离线缓存

4. **添加推送通知**: 集成Firebase Cloud Messaging,实现消息推送功能

5. **发布到应用商店**: 
   - Google Play: https://play.google.com/console
   - 国内应用商店: 华为、小米、OPPO等

6. **持续集成**: 配置CI/CD自动构建和发布流程

### 参考资源

- **Capacitor官方文档**: https://capacitorjs.com/docs
- **Android开发者文档**: https://developer.android.com/docs
- **React官方文档**: https://react.dev/
- **Vite官方文档**: https://vitejs.dev/
- **TailwindCSS文档**: https://tailwindcss.com/docs

### 获取帮助

如果遇到问题:

1. 查看本教程的"常见问题解决"部分
2. 查看项目中的其他文档(BUILD_ANDROID.md、ENV_CONFIG.md等)
3. 搜索错误信息,通常能找到解决方案
4. 在相关技术社区提问(Stack Overflow、GitHub Issues等)

---

**祝您构建顺利!** 🎉
