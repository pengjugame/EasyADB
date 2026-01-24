@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ========================================
echo   EasyADB - Android Device Manager
echo ========================================
echo.

cd src

REM 检查Node.js是否安装
where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Node.js
    echo.
    echo 请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 首次运行，正在安装依赖...
    call npm install
    echo.
)

REM 直接启动ADB文件管理器
echo.
echo 启动 EasyADB 文件管理器...
echo.
node adb-manager.js

pause