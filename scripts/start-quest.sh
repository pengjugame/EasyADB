#!/bin/bash
# EasyADB - Quest 视频管理工具

cd "$(dirname "$0")/.."

echo "========================================"
echo "  EasyADB - Quest 视频管理工具"
echo "========================================"
echo ""

cd src

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js"
    echo ""
    echo "请先安装 Node.js: https://nodejs.org/"
    echo "或运行 scripts/build.sh 生成独立可执行文件"
    echo ""
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install
    echo ""
fi

node quest-video.js
