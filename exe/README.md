# EasyADB 打包说明

本目录用于存放打包后的可执行文件。

## 打包工具

推荐使用 [pkg](https://github.com/vercel/pkg) 将 Node.js 项目打包成可执行文件。

## 打包步骤

### 1. 安装 pkg

```bash
npm install -g pkg
```

### 2. 打包命令

在项目根目录执行：

```bash
# 打包 Quest 视频管理工具
pkg src/quest-video.js -t node18-win-x64 -o exe/quest-video.exe
pkg src/quest-video.js -t node18-macos-x64 -o exe/quest-video-macos
pkg src/quest-video.js -t node18-linux-x64 -o exe/quest-video-linux

# 打包 ADB 文件管理器
pkg src/adb-manager.js -t node18-win-x64 -o exe/adb-manager.exe
pkg src/adb-manager.js -t node18-macos-x64 -o exe/adb-manager-macos
pkg src/adb-manager.js -t node18-linux-x64 -o exe/adb-manager-linux
```

### 3. 打包所有平台

```bash
# Windows
pkg src/quest-video.js -t node18-win-x64 -o exe/quest-video-win.exe
pkg src/adb-manager.js -t node18-win-x64 -o exe/adb-manager-win.exe

# macOS
pkg src/quest-video.js -t node18-macos-x64 -o exe/quest-video-macos
pkg src/adb-manager.js -t node18-macos-x64 -o exe/adb-manager-macos

# Linux
pkg src/quest-video.js -t node18-linux-x64 -o exe/quest-video-linux
pkg src/adb-manager.js -t node18-linux-x64 -o exe/adb-manager-linux
```

## 注意事项

1. **配置文件**：打包后需要手动复制 `src/AdbFileManager` 文件夹到可执行文件同级目录
2. **ADB 工具**：Windows 用户需要确保 `platform-tools` 文件夹在可执行文件同级目录
3. **权限**：macOS 和 Linux 用户需要给可执行文件添加执行权限：
   ```bash
   chmod +x quest-video-macos
   chmod +x adb-manager-macos
   ```

## 发布清单

打包完成后，发布时应包含以下文件：

```
EasyADB-Release/
├── quest-video.exe (或 quest-video-macos / quest-video-linux)
├── adb-manager.exe (或 adb-manager-macos / adb-manager-linux)
├── AdbFileManager/
│   └── config/
│       └── config.json
├── platform-tools/ (仅 Windows)
│   └── adb.exe
└── README.md
```

## 使用方法

打包后的可执行文件可以直接运行，无需安装 Node.js：

```bash
# Windows
quest-video.exe
adb-manager.exe

# macOS / Linux
./quest-video-macos
./adb-manager-macos
```
