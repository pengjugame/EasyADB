@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ========================================
echo   EasyADB - 通用 ADB 文件管理器
echo ========================================
echo.

cd src

REM 检查Node.js是否安装
where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Node.js
    echo.
    echo 请先安装 Node.js: https://nodejs.org/
    echo 或运行 scripts\build.bat 生成独立可执行文件
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

node adb-manager.js

pause
