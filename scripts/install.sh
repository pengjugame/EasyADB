#!/bin/bash
# EasyADB - 安装依赖

cd "$(dirname "$0")/.."

echo "========================================"
echo "  EasyADB - 安装依赖"
echo "========================================"
echo ""

cd src

echo "正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] 安装依赖失败！"
    echo ""
    exit 1
fi

echo ""
echo "========================================"
echo "  安装完成！"
echo "========================================"
echo ""
echo "现在可以运行以下脚本："
echo "  - scripts/start-quest.sh     启动 Quest 视频管理工具"
echo "  - scripts/start-manager.sh   启动通用 ADB 管理器"
echo "  - scripts/build.sh           打包为可执行文件"
echo ""
