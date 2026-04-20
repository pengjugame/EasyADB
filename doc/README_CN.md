# EasyADB 使用文档

[English](../README.md) | 中文文档

通过交互式终端界面管理 Android 设备文件，支持 Meta Quest、手机、平板等设备。

## 功能

- 📱 **设备预设** — 快速选择 Meta Quest（录屏/截图）、安卓相册/下载、或自定义路径
- 📁 **文件浏览** — 扫描设备文件，以表格形式展示（文件名、大小、日期）
- 📤 **导出文件** — 导出到本地，支持按日期范围、应用名称或手动勾选筛选
- 📦 **安装 APK** — 从菜单安装，或直接拖 `.apk` 文件到 `EasyAdb.exe` 图标上安装
- 🗑️ **删除文件** — 多种筛选方式，删除前二次确认
- 🧹 **快速清理** — 保留最近 N 天的文件，删除旧文件
- ⚙️ **设置** — 切换语言（中文/English）、自定义设备路径和文件类型

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
