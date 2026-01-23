# EasyADB 项目结构

本文档描述了 EasyADB 项目的完整目录结构和文件说明。

## 目录结构

```
EasyADB/
├── README.md                           # 项目主文档（英文）
├── LICENSE                             # MIT 开源协议
├── .gitignore                          # Git 忽略文件配置
│
├── src/                                # 源代码目录
│   ├── quest-video.js                  # Quest 视频管理工具主程序
│   ├── adb-manager.js                  # 通用 ADB 文件管理器主程序
│   ├── package.json                    # Node.js 项目配置文件
│   ├── package-lock.json               # 依赖锁定文件
│   │
│   └── AdbFileManager/                 # 配置和资源文件夹
│       ├── config/                     # 配置文件目录
│       │   ├── config.json             # 用户配置文件
│       │   └── config.default.json     # 默认配置模板
│       │
│       └── adb/                        # ADB 工具（可选）
│           ├── adb.exe                 # Windows ADB 可执行文件
│           ├── adb.darwin              # macOS ADB 可执行文件
│           ├── AdbWinApi.dll           # Windows ADB 依赖库
│           └── AdbWinUsbApi.dll        # Windows ADB USB 依赖库
│
├── doc/                                # 文档目录
│   └── README_CN.md                    # 中文完整文档
│
└── exe/                                # 打包输出目录
    └── README.md                       # 打包说明文档
```

## 文件说明

### 根目录文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目主文档，包含快速开始、功能介绍、使用说明（英文） |
| `LICENSE` | MIT 开源协议文件 |
| `.gitignore` | Git 版本控制忽略规则 |

### src/ 源代码目录

| 文件 | 说明 | 行数 |
|------|------|------|
| `quest-video.js` | Meta Quest 视频管理工具，专门用于管理 Quest 设备的录屏和截图 | ~688 行 |
| `adb-manager.js` | 通用 ADB 文件管理器，支持任意 Android 设备和目录 | ~1062 行 |
| `package.json` | Node.js 项目配置，包含依赖、脚本、打包配置等 | ~40 行 |
| `package-lock.json` | 依赖版本锁定文件，确保依赖版本一致性 | 自动生成 |

#### 核心功能模块

**quest-video.js 主要功能：**
- 扫描 Quest 设备视频和截图
- 按日期、应用筛选导出
- 批量删除和清理
- 显示视频详细信息

**adb-manager.js 主要功能：**
- 通用文件扫描和管理
- 多预设配置支持
- 灵活的文件类型过滤
- 递归目录扫描

### src/AdbFileManager/ 配置和资源

| 路径 | 说明 |
|------|------|
| `config/config.json` | 用户配置文件，包含预设配置、路径设置等 |
| `config/config.default.json` | 默认配置模板，用于初始化或重置配置 |
| `adb/` | ADB 工具目录（可选），包含各平台的 ADB 可执行文件 |

#### 配置文件结构

```json
{
  "presets": [
    {
      "name": "配置名称",
      "remotePath": "设备路径",
      "localPath": "本地保存路径",
      "fileTypes": ["文件类型"],
      "recursive": false
    }
  ],
  "currentPreset": 0
}
```

### doc/ 文档目录

| 文件 | 说明 |
|------|------|
| `README_CN.md` | 完整的中文文档，包含详细的安装、配置、使用说明 |

### exe/ 打包目录

| 文件 | 说明 |
|------|------|
| `README.md` | 打包说明文档，包含打包步骤和发布清单 |
| `*.exe` | Windows 可执行文件（打包后生成） |
| `*-macos` | macOS 可执行文件（打包后生成） |
| `*-linux` | Linux 可执行文件（打包后生成） |

## 依赖说明

### 运行时依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `chalk` | ^4.1.2 | 终端彩色输出 |
| `cli-table3` | ^0.6.3 | 表格显示 |
| `dayjs` | ^1.11.10 | 日期处理 |
| `inquirer` | ^8.2.6 | 交互式命令行界面 |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `pkg` | ^5.8.1 | 打包成可执行文件 |

## 使用流程

### 开发模式

```bash
# 1. 进入源代码目录
cd EasyADB/src

# 2. 安装依赖
npm install

# 3. 运行工具
node quest-video.js    # Quest 视频管理
node adb-manager.js    # 通用文件管理
```

### 打包模式

```bash
# 1. 进入源代码目录
cd EasyADB/src

# 2. 安装依赖（包括 pkg）
npm install

# 3. 打包
npm run build:win      # 打包 Windows 版本
npm run build:macos    # 打包 macOS 版本
npm run build:linux    # 打包 Linux 版本
npm run build:all      # 打包所有平台

# 4. 可执行文件输出到 ../exe/ 目录
```

### 发布模式

打包后的发布包应包含：

```
EasyADB-Release/
├── quest-video.exe (或对应平台版本)
├── adb-manager.exe (或对应平台版本)
├── AdbFileManager/
│   └── config/
│       └── config.json
├── platform-tools/ (可选，Windows 推荐)
│   └── adb.exe
└── README.md
```

## 配置管理

### 预设配置示例

项目内置了几个常用的预设配置：

1. **Meta Quest 录屏**
   - 路径: `/sdcard/oculus/VideoShots`
   - 类型: `.mp4`, `.mov`

2. **Meta Quest 截图**
   - 路径: `/sdcard/oculus/Screenshots`
   - 类型: `.jpg`, `.png`

3. **安卓相册**
   - 路径: `/sdcard/DCIM/Camera`
   - 类型: `.jpg`, `.png`, `.mp4`

4. **安卓下载**
   - 路径: `/sdcard/Download`
   - 类型: 所有文件

### 添加自定义配置

编辑 `src/AdbFileManager/config/config.json`：

```json
{
  "presets": [
    {
      "name": "我的自定义配置",
      "remotePath": "/sdcard/MyFolder",
      "localPath": "D:/MyBackup",
      "fileTypes": [".pdf", ".doc"],
      "recursive": true
    }
  ]
}
```

## 开发指南

### 添加新功能

1. 在 `src/` 目录下修改或创建新的 JS 文件
2. 使用现有的工具函数（如 `adbShell()`）
3. 遵循现有的代码风格和交互模式
4. 更新文档说明

### 代码结构

两个主程序都遵循相似的结构：

```javascript
// 1. 依赖导入
const inquirer = require('inquirer');
const chalk = require('chalk');
// ...

// 2. 工具函数
function adbShell(command) { ... }
function checkAdbConnection() { ... }
// ...

// 3. 核心功能函数
async function scanFiles() { ... }
async function exportFiles() { ... }
async function deleteFiles() { ... }
// ...

// 4. 主菜单和程序入口
async function mainMenu() { ... }
async function main() { ... }
main();
```

## 注意事项

1. **ADB 工具**：确保 ADB 可用（系统 PATH 或项目内置）
2. **设备连接**：使用前需要连接并授权 Android 设备
3. **权限问题**：某些系统目录可能需要 root 权限
4. **路径格式**：Windows 使用反斜杠，配置文件中建议使用正斜杠
5. **文件名**：避免使用特殊字符，可能导致导出失败

## 更新日志

### v1.0.0 (2026-01-23)
- 初始版本发布
- 完整的项目结构重组
- 添加 MIT 开源协议
- 完善文档和打包配置
- 修复全部删除功能 BUG

## 贡献

欢迎贡献代码、报告问题或提出建议！

详见主 [README.md](../README.md) 的贡献指南部分。
