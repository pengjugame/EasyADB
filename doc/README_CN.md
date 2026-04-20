# EasyADB 使用文档

[English](../README.md) | 中文文档

通过交互式终端界面管理 Android 设备文件，支持 Meta Quest、手机、平板等设备。

## 功能

- 📱 **设备预设** — 内置常用预设（Meta Quest 录屏/截图、安卓相册/下载），也可自定义路径，无需记忆设备目录。

- 📤 **智能导出** — 按日期范围、应用名称筛选，或手动逐个勾选。导出后自动按日期建子文件夹归类，无需手动整理。

- 🗑️ **精准删除** — 与导出相同的筛选方式：按日期、按应用或手动选择。确认前显示将释放的总空间。

- 🧹 **一键清理** — 选择保留最近几天（今天 / 3 / 7 / 14 / 30 天），旧文件全部清除。Quest 存储不足时特别好用。

- 📦 **安装 APK** — 从菜单选择安装，或直接拖 `.apk` 文件到 `EasyAdb.exe` 图标上即可。常见安装失败（版本降级、存储不足等）均有友好提示。

- ⚙️ **开箱即用** — 内置 ADB，解压即运行，无需额外安装环境。支持中文 / English。

## 快速开始

### 方式一：使用可执行文件（推荐）

1. 下载最新 Release 并解压
2. 将包含 `adb.exe` 的 `adb/` 文件夹放在 `EasyAdb.exe` 旁边，或确保系统 PATH 中有 ADB
3. 双击运行 `EasyAdb.exe`

安装 APK：将 `.apk` 文件拖到 `EasyAdb.exe` 图标上即可直接安装。

### 方式二：从源码运行

```bash
git clone https://github.com/pengjugame/EasyADB.git
cd EasyADB/src
npm install
node adb-manager.js
```

需要 Node.js 14+ 和 ADB（或将 `adb.exe` 放到 `src/lib/adb/adb.exe`）。

## 设备连接

在 Android 设备上启用 USB 调试，然后通过 USB 或 WiFi 连接：

```bash
# WiFi 连接
adb tcpip 5555
adb connect <设备IP>:5555

# 验证连接
adb devices
```

Meta Quest：设置 → 开发者 → USB 调试。

## 配置文件

配置文件位置：
- **可执行文件版**：`lib/config/config.json`（与 `EasyAdb.exe` 同目录）
- **源码版**：`src/lib/config/config.json`

首次运行时自动创建。示例：

```json
{
  "device": {
    "remotePath": "/sdcard/oculus/VideoShots",
    "fileExtensions": [".mp4"]
  },
  "presets": {
    "MetaQuest3_Videos": {
      "name": "Meta Quest 录屏",
      "remotePath": "/sdcard/oculus/VideoShots",
      "fileExtensions": [".mp4"]
    },
    "Android_DCIM": {
      "name": "安卓相册",
      "remotePath": "/sdcard/DCIM/Camera",
      "fileExtensions": [".jpg", ".png", ".mp4"]
    }
  }
}
```

## 常见问题

| 问题 | 解决方法 |
|------|---------|
| 找不到 ADB | 将 `adb.exe` 放到 `lib/adb/` 目录，或安装 [Android Platform Tools](https://developer.android.com/studio/releases/platform-tools) |
| 未检测到设备 | 运行 `adb devices` 确认；重新插拔 USB 或重连 WiFi |
| 设备未授权 | 在设备上同意 USB 调试授权弹窗 |
| 设备离线 | 运行 `adb kill-server` 再 `adb start-server` |
| 权限不足 | 部分系统目录需要 root 权限 |

## 许可证

MIT License — 详见 [LICENSE](../LICENSE)
