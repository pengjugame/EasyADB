#!/bin/bash
# EasyADB - 打包可执行文件

cd "$(dirname "$0")/.."

echo "========================================"
echo "  EasyADB - 打包可执行文件"
echo "========================================"
echo ""

cd src

echo "[1/3] 检查并安装依赖..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 安装依赖失败！"
        exit 1
    fi
fi

echo ""
echo "[2/3] 安装 pkg 打包工具..."
npm install pkg --save-dev
if [ $? -ne 0 ]; then
    echo "[错误] 安装 pkg 失败！"
    exit 1
fi

echo ""
echo "[3/3] 打包为可执行文件..."
echo ""

# 检测操作系统
OS="$(uname -s)"
case "${OS}" in
    Linux*)     TARGET="node18-linux-x64";;
    Darwin*)    TARGET="node18-macos-x64";;
    *)          echo "[错误] 不支持的操作系统: ${OS}"; exit 1;;
esac

echo "正在打包 Quest 视频管理工具 (${TARGET})..."
npx pkg quest-video.js -t ${TARGET} -o ../exe/quest-video
if [ $? -ne 0 ]; then
    echo "[错误] 打包 quest-video 失败！"
    exit 1
fi

echo "正在打包通用 ADB 管理器 (${TARGET})..."
npx pkg adb-manager.js -t ${TARGET} -o ../exe/adb-manager
if [ $? -ne 0 ]; then
    echo "[错误] 打包 adb-manager 失败！"
    exit 1
fi

echo ""
echo "复制配置文件..."
mkdir -p ../exe/AdbFileManager/config
cp -f AdbFileManager/config/*.json ../exe/AdbFileManager/config/

# 添加执行权限
chmod +x ../exe/quest-video
chmod +x ../exe/adb-manager

echo ""
echo "========================================"
echo "  打包完成！"
echo "========================================"
echo ""
echo "输出文件："
echo "  exe/quest-video"
echo "  exe/adb-manager"
echo "  exe/AdbFileManager/config/"
echo ""
echo "使用说明："
echo "  1. 运行 ./quest-video 或 ./adb-manager"
echo "  2. 确保设备已连接并启用 USB 调试"
echo "  3. 配置文件位于 AdbFileManager/config/config.json"
echo ""
