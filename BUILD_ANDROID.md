# 课程交付CRM - Android App 构建指南

本文档说明如何将课程交付CRM Web应用构建成Android App。

## 项目说明

本项目使用**Capacitor**框架将Web应用封装成原生Android应用。Capacitor是由Ionic团队开发的跨平台应用运行时,可以将Web应用转换为iOS和Android原生应用。

## 系统要求

### 必需软件

1. **Java Development Kit (JDK) 17**
   - 下载地址: https://adoptium.net/
   - 安装后设置环境变量 `JAVA_HOME`

2. **Android Studio**
   - 下载地址: https://developer.android.com/studio
   - 安装时选择"Standard"安装类型
   - 确保安装了Android SDK、Android SDK Platform和Android Virtual Device

3. **Node.js 18+**
   - 下载地址: https://nodejs.org/
   - 推荐使用LTS版本

4. **pnpm**
   - 安装命令: `npm install -g pnpm`

### Android SDK配置

安装Android Studio后,需要配置以下环境变量:

**Windows:**
```
ANDROID_HOME=C:\Users\你的用户名\AppData\Local\Android\Sdk
Path=%Path%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools
```

**macOS/Linux:**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# 或
export ANDROID_HOME=$HOME/Android/Sdk  # Linux

export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

## 项目结构

```
course_crm/
├── android/                    # Android原生项目目录
│   ├── app/                    # Android应用模块
│   │   ├── src/main/
│   │   │   ├── assets/public/  # Web资源文件
│   │   │   ├── java/           # Java/Kotlin代码
│   │   │   ├── res/            # Android资源文件
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle        # 应用构建配置
│   ├── gradle/                 # Gradle wrapper
│   └── build.gradle            # 项目构建配置
├── client/                     # Web应用前端源码
├── server/                     # Web应用后端源码
├── dist/                       # Web应用构建输出
│   └── public/                 # 前端静态资源
├── capacitor.config.ts         # Capacitor配置文件
└── package.json                # Node.js项目配置
```

## 构建步骤

### 1. 安装依赖

```bash
cd course_crm
pnpm install
```

### 2. 构建Web应用

```bash
pnpm build
```

这个命令会:
- 使用Vite构建前端应用到 `dist/public/`
- 使用esbuild构建后端服务到 `dist/`

### 3. 同步Web资源到Android项目

```bash
npx cap sync android
```

这个命令会:
- 将 `dist/public/` 中的Web资源复制到Android项目
- 更新Android项目中的Capacitor插件
- 生成 `capacitor.config.json` 配置文件

### 4. 打开Android Studio

```bash
npx cap open android
```

或者手动打开Android Studio,然后选择"Open an Existing Project",选择 `course_crm/android` 目录。

### 5. 在Android Studio中构建APK

#### 方式一: 构建Debug APK(用于测试)

1. 在Android Studio中,点击菜单 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. 等待构建完成(首次构建可能需要10-20分钟下载依赖)
3. 构建完成后,点击通知中的"locate"链接,找到生成的APK文件
4. APK文件位置: `android/app/build/outputs/apk/debug/app-debug.apk`

#### 方式二: 构建Release APK(用于发布)

1. 首先需要生成签名密钥(Keystore):
   ```bash
   keytool -genkey -v -keystore course-crm.keystore -alias course-crm -keyalg RSA -keysize 2048 -validity 10000
   ```
   
2. 在 `android/app/build.gradle` 中配置签名:
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

3. 在Android Studio中,点击菜单 `Build` → `Generate Signed Bundle / APK`
4. 选择"APK",点击"Next"
5. 选择你的keystore文件,输入密码,点击"Next"
6. 选择"release"构建类型,点击"Finish"
7. APK文件位置: `android/app/build/outputs/apk/release/app-release.apk`

### 6. 安装APK到设备

#### 使用USB连接的真机:

1. 在手机上启用"开发者选项"和"USB调试"
2. 用USB线连接手机和电脑
3. 在Android Studio中点击"Run"按钮(绿色三角形)
4. 选择你的设备,点击"OK"

#### 使用模拟器:

1. 在Android Studio中,点击 `Tools` → `Device Manager`
2. 点击"Create Device"创建新的虚拟设备
3. 选择设备型号(推荐Pixel 5)和系统版本(推荐Android 11+)
4. 启动模拟器,然后在Android Studio中点击"Run"按钮

#### 手动安装APK:

1. 将APK文件传输到手机
2. 在手机上打开文件管理器,找到APK文件
3. 点击APK文件,按照提示安装

## 配置说明

### 应用信息配置

编辑 `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.course.crm',           // 应用包名(唯一标识)
  appName: '课程交付CRM',             // 应用显示名称
  webDir: 'dist/public',             // Web资源目录
  server: {
    // 开发模式下可以配置为本地服务器地址
    // url: 'http://192.168.1.100:3000',
    // cleartext: true
  },
  android: {
    allowMixedContent: true,         // 允许混合内容(HTTP+HTTPS)
    webContentsDebuggingEnabled: true // 允许WebView调试
  }
};
```

### Android应用配置

编辑 `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">课程交付CRM</string>
    <string name="title_activity_main">课程交付CRM</string>
    <string name="package_name">com.course.crm</string>
    <string name="custom_url_scheme">com.course.crm</string>
</resources>
```

### 应用图标

替换以下目录中的图标文件:
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

### 权限配置

编辑 `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## 常见问题

### 1. 构建失败: "SDK location not found"

**解决方法:**
- 确保已安装Android Studio和Android SDK
- 在 `android/local.properties` 中设置SDK路径:
  ```
  sdk.dir=/Users/你的用户名/Library/Android/sdk  # macOS
  sdk.dir=C\:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk  # Windows
  ```

### 2. 应用安装后无法打开或闪退

**解决方法:**
- 检查 `dist/public/index.html` 是否存在
- 确保运行了 `pnpm build` 和 `npx cap sync android`
- 在Android Studio中查看Logcat日志,查找错误信息

### 3. 应用中网络请求失败

**解决方法:**
- 检查 `AndroidManifest.xml` 中是否添加了 `INTERNET` 权限
- 如果后端API使用HTTP(非HTTPS),需要在 `AndroidManifest.xml` 中添加:
  ```xml
  <application
      android:usesCleartextTraffic="true"
      ...>
  ```

### 4. 应用显示空白页面

**解决方法:**
- 检查 `capacitor.config.ts` 中的 `webDir` 配置是否正确
- 确保Web资源已正确构建到 `dist/public/` 目录
- 在Chrome中打开 `chrome://inspect` 调试WebView

### 5. Gradle构建速度慢

**解决方法:**
- 在 `android/gradle.properties` 中添加:
  ```properties
  org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
  org.gradle.parallel=true
  org.gradle.caching=true
  android.useAndroidX=true
  android.enableJetifier=true
  ```

## 开发模式

如果你想在开发时让Android App连接到本地开发服务器(而不是打包的静态文件),可以:

1. 启动本地开发服务器:
   ```bash
   pnpm dev
   ```

2. 修改 `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.100:3000',  // 替换为你的电脑IP地址
     cleartext: true
   }
   ```

3. 重新同步:
   ```bash
   npx cap sync android
   ```

4. 在Android Studio中运行应用

这样,Android App会直接访问你的开发服务器,支持热重载。

## 发布到Google Play

1. 构建Release APK或AAB(Android App Bundle)
2. 在Google Play Console中创建应用
3. 填写应用信息、截图、描述等
4. 上传APK或AAB文件
5. 提交审核

详细步骤请参考: https://developer.android.com/studio/publish

## 技术支持

- Capacitor官方文档: https://capacitorjs.com/docs
- Android开发者文档: https://developer.android.com/docs
- Capacitor社区论坛: https://forum.ionicframework.com/c/capacitor

## 注意事项

1. **后端服务**: 本应用是一个全栈应用,包含后端服务。Android App只包含前端部分,后端服务需要单独部署到服务器上。

2. **API地址配置**: 确保前端代码中的API地址指向正确的后端服务器地址,而不是localhost。

3. **数据库**: Android App无法直接访问MySQL数据库,所有数据操作必须通过后端API进行。

4. **认证**: 应用使用Manus OAuth认证,确保OAuth配置正确,回调地址包含Android App的scheme。

5. **更新**: 每次修改Web应用代码后,都需要重新运行 `pnpm build` 和 `npx cap sync android`,然后重新构建Android App。

## 快速命令参考

```bash
# 安装依赖
pnpm install

# 构建Web应用
pnpm build

# 同步到Android项目
npx cap sync android

# 打开Android Studio
npx cap open android

# 查看Capacitor配置
npx cap doctor

# 清理构建缓存
cd android && ./gradlew clean
```

## 版本信息

- Capacitor: 8.0.1
- Android Gradle Plugin: 8.x
- Gradle: 8.x
- Target SDK: 34 (Android 14)
- Min SDK: 22 (Android 5.1)
