@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ========================================
echo   EasyADB - 打包可执行文件
echo ========================================
echo.

cd src

echo [1/3] 检查并安装依赖...
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo [错误] 安装依赖失败！
        pause
        exit /b 1
    )
)

echo.
echo [2/3] 安装 pkg 打包工具...
call npm install pkg --save-dev
if errorlevel 1 (
    echo [错误] 安装 pkg 失败！
    pause
    exit /b 1
)

echo.
echo [3/3] 打包为可执行文件...
echo.
echo 正在打包 Quest 视频管理工具...
call npx pkg quest-video.js -t node18-win-x64 -o ..\exe\quest-video.exe
if errorlevel 1 (
    echo [错误] 打包 quest-video 失败！
    pause
    exit /b 1
)

echo 正在打包通用 ADB 管理器...
call npx pkg adb-manager.js -t node18-win-x64 -o ..\exe\adb-manager.exe
if errorlevel 1 (
    echo [错误] 打包 adb-manager 失败！
    pause
    exit /b 1
)

echo.
echo 复制配置文件...
if not exist "..\exe\AdbFileManager" mkdir "..\exe\AdbFileManager"
if not exist "..\exe\AdbFileManager\config" mkdir "..\exe\AdbFileManager\config"
copy /Y "AdbFileManager\config\*.json" "..\exe\AdbFileManager\config\" >nul

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 输出文件：
echo   exe\quest-video.exe
echo   exe\adb-manager.exe
echo   exe\AdbFileManager\config\
echo.
echo 使用说明：
echo   1. 双击 quest-video.exe 或 adb-manager.exe 运行
echo   2. 确保设备已连接并启用 USB 调试
echo   3. 配置文件位于 AdbFileManager\config\config.json
echo.
pause
