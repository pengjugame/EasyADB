# EasyADB 使用文档

## 简介

EasyADB 是一个基于 Node.js 的 ADB 文件管理工具，专为 Android 设备（特别是 Meta Quest）设计，提供便捷的文件导出、删除和管理功能。

## 功能特性

### 1. Quest 视频管理工具 (quest-video.js)

专门为 Meta Quest 设备设计的视频管理工具。

**主要功能：**
- 📹 扫描设备上的录屏和截图
- 📤 导出视频到本地（支持按日期分类）
- 🗑️ 删除设备上的视频（支持多种筛选方式）
- 🧹 清理设备（保留最近 N 天的视频）
- 📊 显示视频详细信息（日期、大小、来源应用等）

**使用方法：**
```bash
node src/quest-video.js
```

### 2. ADB 文件管理器 (adb-manager.js)

通用的 ADB 文件管理工具，支持任意 Android 设备和目录。

**主要功能：**
- 📁 扫描指定目录的文件
- 📤 导出文件到本地（支持按日期分类）
- 🗑️ 删除设备文件（支持多种筛选方式）
- 🧹 清理设备（保留最近 N 天的文件）
- ⚙️ 配置管理（支持多个预设配置）

**使用方法：**
```bash
node src/adb-manager.js
```

## 安装说明

### 前置要求

1. **Node.js**：需要安装 Node.js 14.0 或更高版本
2. **ADB 工具**：需要安装 Android Debug Bridge
   - Windows: 可以使用系统 ADB 或项目内置的 platform-tools
   - macOS/Linux: 需要安装 Android SDK Platform Tools

### 安装步骤

1. 克隆或下载项目
```bash
git clone https://github.com/pengjugame/EasyADB.git
cd EasyADB
```

2. 安装依赖
```bash
cd src
npm install
```

3. 连接 Android 设备
```bash
# 通过 USB 连接设备并启用 USB 调试
# 或通过 WiFi 连接（需要先配对）
adb connect 设备IP:5555
```

4. 运行工具
```bash
# Quest 视频管理
node quest-video.js

# 通用文件管理
node adb-manager.js
```

## 配置说明

配置文件位于 `src/AdbFileManager/config/config.json`

### 配置示例

```json
{
  "presets": [
    {
      "name": "Meta Quest 录屏",
      "remotePath": "/sdcard/oculus/VideoShots",
      "localPath": "E:/Quest3Videos",
      "fileTypes": [".mp4", ".mov"],
      "recursive": false
    }
  ],
  "currentPreset": 0
}
```

### 配置项说明

- `name`: 配置名称
- `remotePath`: 设备上的目录路径
- `localPath`: 本地保存路径
- `fileTypes`: 文件类型过滤（如 [".mp4", ".jpg"]）
- `recursive`: 是否递归扫描子目录

## 功能详解

### 导出功能

支持多种导出方式：

1. **全部导出**：导出所有文件到本地
2. **按日期导出**：
   - 今天
   - 最近 3 天
   - 最近 7 天
   - 最近 14 天
   - 最近 30 天
   - 自定义日期范围
3. **按应用导出**：选择特定应用的文件
4. **组合筛选**：同时按日期和应用筛选
5. **手动勾选**：逐个选择要导出的文件

### 删除功能

支持多种删除方式：

1. **全部删除**：删除所有文件
2. **按日期删除**：删除特定日期范围的文件
3. **按应用删除**：删除特定应用的文件
4. **组合筛选**：同时按日期和应用筛选
5. **手动勾选**：逐个选择要删除的文件

**安全机制：**
- 所有删除操作都需要二次确认
- 显示将要删除的文件列表和释放的空间
- 逐个删除并验证结果

### 清理功能

快速清理设备，保留最近 N 天的文件：

- 保留今天
- 保留最近 3 天
- 保留最近 7 天
- 保留最近 14 天
- 保留最近 30 天
- 全部删除

## 常见问题

### 1. 找不到 ADB 命令

**解决方法：**
- Windows: 确保 `platform-tools` 文件夹在项目根目录
- macOS/Linux: 安装 Android SDK Platform Tools 并添加到 PATH

### 2. 设备未连接

**解决方法：**
```bash
# 检查设备连接
adb devices

# USB 连接：确保启用了 USB 调试
# WiFi 连接：
adb connect 设备IP:5555
```

### 3. 权限不足

**解决方法：**
- 确保设备上已授权 USB 调试
- 某些系统目录可能需要 root 权限

### 4. 文件导出失败

**解决方法：**
- 检查本地保存路径是否存在
- 确保有足够的磁盘空间
- 检查文件名是否包含非法字符

## 技术栈

- **Node.js**: 运行环境
- **inquirer**: 交互式命令行界面
- **chalk**: 终端彩色输出
- **dayjs**: 日期处理
- **cli-table3**: 表格显示
- **child_process**: 执行 ADB 命令

## 开发说明

### 项目结构

```
EasyADB/
├── src/                    # 源代码目录
│   ├── quest-video.js      # Quest 视频管理工具
│   ├── adb-manager.js      # 通用 ADB 文件管理器
│   ├── package.json        # 项目依赖
│   └── AdbFileManager/     # 配置文件夹
│       └── config/
│           └── config.json # 配置文件
├── doc/                    # 文档目录
├── exe/                    # 打包目录
├── README.md               # 项目说明
└── LICENSE                 # 开源协议
```

### 添加新功能

1. 在 `src/` 目录下修改或添加新的 JS 文件
2. 使用 `adbShell()` 函数执行 ADB 命令
3. 使用 `inquirer` 创建交互式界面
4. 使用 `chalk` 添加彩色输出

### 代码规范

- 使用 async/await 处理异步操作
- 所有删除操作必须有二次确认
- 显示操作进度和结果统计
- 错误处理要友好且详细

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](../LICENSE) 文件

## 联系方式

如有问题或建议，欢迎提交 Issue。

## 更新日志

### v1.0.0 (2026-01-23)
- 初始版本发布
- 支持 Quest 视频管理
- 支持通用 ADB 文件管理
- 修复全部删除功能的 BUG
