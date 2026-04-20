# EasyADB

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/pengjugame/EasyADB)

[English](README.md) | [中文文档](doc/README_CN.md)

A user-friendly ADB file management tool for Android devices (Meta Quest, smartphones, tablets). Manage files, install APKs, and keep your device organized with an interactive terminal interface.

## Features

- 📱 **Device Presets** — Quick-select from Meta Quest (videos/screenshots), Android camera/download, or custom path
- 📁 **File Browser** — Scan and display files in a formatted table with size and date info
- 📤 **Export** — Export files to local disk, organized by date; filter by date range, app name, or manual selection
- 📦 **Install APK** — Install APKs from the menu, or drag & drop an APK onto `EasyAdb.exe` to install instantly
- 🗑️ **Delete** — Delete files with multiple filter options and a confirmation prompt
- 🧹 **Cleanup** — Keep files from the last N days and remove the rest
- ⚙️ **Settings** — Switch language (Chinese / English), customize device path and file types

## Quick Start

### Option A — Run the executable (recommended)

1. Download the latest release and extract it
2. Place the `adb/` folder (containing `adb.exe`) next to `EasyAdb.exe`, or ensure `adb` is on your system PATH
3. Double-click `EasyAdb.exe`

To install an APK: drag any `.apk` file onto `EasyAdb.exe`.

### Option B — Run from source

```bash
git clone https://github.com/pengjugame/EasyADB.git
cd EasyADB/src
npm install
node adb-manager.js
```

Requires Node.js 14+ and ADB on your PATH (or place `adb.exe` in `src/lib/adb/adb.exe`).

## Device Setup

Enable USB debugging on your Android device, then connect via USB or WiFi:

```bash
# WiFi connection
adb tcpip 5555
adb connect <device-ip>:5555

# Verify
adb devices
```

For Meta Quest: Settings → Developer → USB Debugging.

## Configuration

Config file location:
- **Executable**: `lib/config/config.json` (next to `EasyAdb.exe`)
- **Source**: `src/lib/config/config.json`

The config is created automatically on first run. Example:

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

## Build from Source

```bash
# Install pkg globally
npm install -g pkg

# Build Windows executable
cd src
npm run build
# Output: exe/EasyAdb.exe
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ADB not found` | Place `adb.exe` in `lib/adb/` next to the exe, or install [Android Platform Tools](https://developer.android.com/studio/releases/platform-tools) |
| `No devices found` | Run `adb devices` to verify; re-plug USB or reconnect WiFi |
| `Unauthorized` | Approve the USB debugging prompt on the device |
| `Device offline` | Run `adb kill-server` then `adb start-server` |
| `Permission denied` | Some system directories require root access |

## License

MIT License — see [LICENSE](LICENSE) for details.
