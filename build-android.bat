@echo off
REM 课程交付CRM系统 - Android APK构建脚本 (Windows)
REM 用法: build-android.bat [debug|release|bundle]

setlocal enabledelayedexpansion

set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=debug

set PROJECT_DIR=%~dp0
set ANDROID_DIR=%PROJECT_DIR%android

echo ================================
echo 课程交付CRM系统 - Android构建
echo ================================
echo 构建类型: %BUILD_TYPE%
echo 项目目录: %PROJECT_DIR%
echo.

REM 检查必要的工具
echo 检查环境...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Node.js
    exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到pnpm
    exit /b 1
)

echo ✅ 环境检查通过
echo.

REM 步骤1: 构建Web应用
echo 步骤1: 构建Web应用...
cd /d "%PROJECT_DIR%"
call pnpm build
if errorlevel 1 (
    echo ❌ Web应用构建失败
    exit /b 1
)
echo ✅ Web应用构建完成
echo.

REM 步骤2: 同步到Android
echo 步骤2: 同步资源到Android项目...
call npx cap sync android
if errorlevel 1 (
    echo ❌ 资源同步失败
    exit /b 1
)
echo ✅ 资源同步完成
echo.

REM 步骤3: 构建APK
echo 步骤3: 构建%BUILD_TYPE% APK...
cd /d "%ANDROID_DIR%"

if "%BUILD_TYPE%"=="debug" (
    call gradlew.bat assembleDebug
    if errorlevel 1 (
        echo ❌ Debug APK构建失败
        exit /b 1
    )
    set APK_PATH=%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug.apk
    echo ✅ Debug APK构建完成
) else if "%BUILD_TYPE%"=="release" (
    call gradlew.bat assembleRelease
    if errorlevel 1 (
        echo ❌ Release APK构建失败
        exit /b 1
    )
    set APK_PATH=%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk
    echo ✅ Release APK构建完成
) else if "%BUILD_TYPE%"=="bundle" (
    call gradlew.bat bundleRelease
    if errorlevel 1 (
        echo ❌ Bundle构建失败
        exit /b 1
    )
    set APK_PATH=%ANDROID_DIR%\app\build\outputs\bundle\release\app-release.aab
    echo ✅ Bundle构建完成
) else (
    echo ❌ 错误: 未知的构建类型 '%BUILD_TYPE%'
    echo 用法: build-android.bat [debug^|release^|bundle]
    exit /b 1
)

echo.
echo ================================
echo ✅ 构建成功!
echo ================================
echo 输出文件: %APK_PATH%
echo.

if exist "%APK_PATH%" (
    for /F "usebackq" %%A in ('%APK_PATH%') do set SIZE=%%~zA
    echo 文件大小: %SIZE% 字节
    echo.
    echo 后续步骤:
    if "%BUILD_TYPE%"=="debug" (
        echo 1. 连接Android设备并启用USB调试
        echo 2. 运行: adb install "%APK_PATH%"
        echo 3. 在设备上启动应用
    ) else if "%BUILD_TYPE%"=="release" (
        echo 1. 对APK进行签名
        echo 2. 在真机上测试
        echo 3. 上传到Google Play
    ) else if "%BUILD_TYPE%"=="bundle" (
        echo 1. 上传到Google Play Console
        echo 2. Google Play将自动为不同设备生成优化的APK
    )
) else (
    echo ❌ 错误: APK文件未找到
    exit /b 1
)

endlocal
