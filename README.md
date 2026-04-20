# EasyADB

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/pengjugame/EasyADB)

[English](README.md) | [中文文档](doc/README_CN.md)

A user-friendly ADB file management tool for Android devices (Meta Quest, smartphones, tablets). Manage files, install APKs, and keep your device organized with an interactive terminal interface.

## Features

- 📱 **Device Presets** — Pick from built-in presets (Meta Quest videos/screenshots, Android camera/downloads) or enter a custom path. No need to remember device directory paths.

- 📤 **Smart Export** — Filter files by date range, by app name, or hand-pick individually. Exported files are automatically sorted into date-named subfolders — no manual organizing needed.

- 🗑️ **Targeted Deletion** — Same filtering options as export: delete by date, by app, or by selection. Shows total size to be freed before confirming.

- 🧹 **One-step Cleanup** — Just choose how many days to keep (today / 3 / 7 / 14 / 30 days), and everything older gets cleared. Useful when Quest storage is running low.

- 📦 **APK Install** — Install from the menu, or drag & drop any `.apk` file directly onto `EasyAdb.exe`. Friendly error messages for common failures (version downgrade, storage full, etc.).

- ⚙️ **Zero Setup** — ADB is bundled. Just extract and run. Supports Chinese / English.

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
