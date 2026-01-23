# EasyADB

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/pengjugame/EasyADB)

[English](README.md) | [中文文档](doc/README_CN.md) | [快速开始](doc/QUICK_START.md)

A powerful and user-friendly ADB file management tool built with Node.js, designed for Android devices (especially Meta Quest). Easily export, delete, and manage files with an interactive command-line interface.

## Features

- 📹 **Quest Video Manager**: Specialized tool for Meta Quest recordings and screenshots
- 📁 **Universal ADB Manager**: Manage files on any Android device
- 📤 **Smart Export**: Export files with date-based organization
- 🗑️ **Safe Deletion**: Multiple filtering options with confirmation prompts
- 🧹 **Quick Cleanup**: Keep recent files and remove old ones
- ⚙️ **Preset Configs**: Save and switch between multiple device configurations
- 🎨 **Beautiful UI**: Colorful terminal interface with tables and progress indicators

## Quick Start

### Prerequisites

- Node.js 14.0 or higher
- Android Debug Bridge (ADB)
- Android device with USB debugging enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/pengjugame/EasyADB.git
cd EasyADB

# Install dependencies (choose one method)

# Method 1: Use convenience scripts (Recommended)
# Windows
scripts\install.bat

# macOS/Linux
chmod +x scripts/*.sh
scripts/install.sh

# Method 2: Manual installation
cd src
npm install
```

### Running the Tools

**Using convenience scripts (Recommended)**:

```bash
# Windows
scripts\start-quest.bat      # Quest video manager
scripts\start-manager.bat    # Universal ADB manager

# macOS/Linux
scripts/start-quest.sh       # Quest video manager
scripts/start-manager.sh     # Universal ADB manager
```

**Manual method**:

```bash
cd src
node quest-video.js    # For Quest devices
node adb-manager.js    # For general Android devices
```

## Usage

### Quest Video Manager

```bash
node src/quest-video.js
```

Features:
- Scan videos and screenshots on Quest devices
- Export by date, app, or custom selection
- Delete with multiple filtering options
- Cleanup old files while keeping recent ones

### ADB File Manager

```bash
node src/adb-manager.js
```

Features:
- Manage files in any directory on Android devices
- Support for multiple preset configurations
- Flexible file type filtering
- Recursive directory scanning

## Configuration

Edit `src/AdbFileManager/config/config.json` to customize:

```json
{
  "presets": [
    {
      "name": "Meta Quest Videos",
      "remotePath": "/sdcard/oculus/VideoShots",
      "localPath": "E:/Quest3Videos",
      "fileTypes": [".mp4", ".mov"],
      "recursive": false
    }
  ],
  "currentPreset": 0
}
```

## Project Structure

```
EasyADB/
├── src/                    # Source code
│   ├── quest-video.js      # Quest video manager
│   ├── adb-manager.js      # Universal ADB manager
│   ├── package.json        # Dependencies
│   └── AdbFileManager/     # Configuration folder
├── scripts/                # Convenience scripts
│   ├── install.bat/sh      # Install dependencies
│   ├── start-quest.bat/sh  # Start Quest tool
│   ├── start-manager.bat/sh# Start ADB manager
│   ├── build.bat/sh        # Build executables
│   └── README.md           # Scripts documentation
├── doc/                    # Documentation
│   └── README_CN.md        # Chinese documentation
├── exe/                    # Compiled executables
├── README.md               # This file
└── LICENSE                 # MIT License
```

## Building Executables

Use the convenience scripts or pkg directly:

**Using scripts (Recommended)**:

```bash
# Windows
scripts\build.bat

# macOS/Linux
scripts/build.sh
```

**Manual method**:

```bash
# Install pkg globally
npm install -g pkg

# Build for Windows
pkg src/quest-video.js -t node18-win-x64 -o exe/quest-video.exe

# Build for macOS
pkg src/quest-video.js -t node18-macos-x64 -o exe/quest-video-macos

# Build for Linux
pkg src/quest-video.js -t node18-linux-x64 -o exe/quest-video-linux
```

See [exe/README.md](exe/README.md) and [scripts/README.md](scripts/README.md) for detailed instructions.

## Documentation

- 📖 [Quick Start Guide](doc/QUICK_START.md) - Get started in 5 minutes
- 🇨🇳 [中文完整文档](doc/README_CN.md) - Complete Chinese documentation
- 📁 [Project Structure](doc/PROJECT_STRUCTURE.md) - Detailed project structure
- 🔨 [Build Guide](exe/README.md) - How to build executables
- 🚀 [Scripts Guide](scripts/README.md) - Convenience scripts documentation
- 📝 [Changelog](CHANGELOG.md) - Version history and updates

## Screenshots

> **Note**: Screenshots will be added in future releases. The tool features:
> - Colorful terminal interface with tables
> - Interactive menus with arrow key navigation
> - Progress indicators for file operations
> - Clear status messages and confirmations

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0 (2026-01-23)
- Initial release
- Quest video management support
- Universal ADB file management
- Fixed "delete all" functionality bug

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/pengjugame/EasyADB/issues).

## Acknowledgments

Built with:
- [Node.js](https://nodejs.org/)
- [inquirer](https://github.com/SBoudrias/Inquirer.js)
- [chalk](https://github.com/chalk/chalk)
- [dayjs](https://github.com/iamkun/dayjs)
- [cli-table3](https://github.com/cli-table/cli-table3)

---

Made with ❤️ for the Android and Quest community
