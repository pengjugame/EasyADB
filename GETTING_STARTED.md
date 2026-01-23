# EasyADB 使用指南

欢迎使用 EasyADB！这是一个简洁的使用指南，帮助你快速上手。

## 🚀 5 分钟快速开始

### Windows 用户

1. **下载项目**
   ```cmd
   git clone https://github.com/pengjugame/EasyADB.git
   cd EasyADB
   ```

2. **安装依赖**
   ```cmd
   双击运行: scripts\install.bat
   ```

3. **连接设备**
   - 使用 USB 线连接 Android 设备
   - 在设备上允许 USB 调试授权

4. **启动工具**
   ```cmd
   双击运行: scripts\start-quest.bat      (Quest 视频管理)
   或
   双击运行: scripts\start-manager.bat    (通用 ADB 管理)
   ```

### macOS/Linux 用户

1. **下载项目**
   ```bash
   git clone https://github.com/pengjugame/EasyADB.git
   cd EasyADB
   ```

2. **添加执行权限**
   ```bash
   chmod +x scripts/*.sh
   ```

3. **安装依赖**
   ```bash
   ./scripts/install.sh
   ```

4. **连接设备**
   - 使用 USB 线连接 Android 设备
   - 在设备上允许 USB 调试授权

5. **启动工具**
   ```bash
   ./scripts/start-quest.sh       # Quest 视频管理
   # 或
   ./scripts/start-manager.sh     # 通用 ADB 管理
   ```

---

## 📖 主要功能

### Quest 视频管理工具

**功能**：
- 📹 扫描 Quest 设备上的录屏和截图
- 📤 导出视频到本地（按日期分类）
- 🗑️ 删除设备上的视频
- 🧹 清理设备（保留最近 N 天）

**使用场景**：
- Quest 存储空间不足，需要清理旧视频
- 定期备份 Quest 录屏到电脑
- 批量管理 Quest 截图和录像

### 通用 ADB 文件管理器

**功能**：
- 📁 管理任意 Android 设备的文件
- ⚙️ 支持多个预设配置
- 🔍 灵活的文件类型过滤
- 📂 递归目录扫描

**使用场景**：
- 管理手机相册照片
- 导出下载文件夹内容
- 批量处理设备文件

---

## 🔧 常见操作

### 1. 导出文件

1. 启动工具
2. 选择 `📤 导出文件到本地`
3. 选择筛选方式：
   - 全部导出
   - 按日期导出
   - 按应用导出
   - 手动勾选
4. 确认导出

### 2. 删除文件

1. 启动工具
2. 选择 `🗑️ 删除设备文件`
3. 选择要删除的文件
4. **仔细检查**将要删除的文件列表
5. 确认删除（输入 `y`）

⚠️ **警告**：删除操作不可恢复，请谨慎操作！

### 3. 快速清理

1. 启动工具
2. 选择 `🧹 清理设备（保留最近X天）`
3. 选择保留时间（如：保留最近 7 天）
4. 查看将要删除的文件
5. 确认删除

---

## 📦 打包为可执行文件

如果你想创建独立的可执行文件（无需安装 Node.js）：

**Windows**：
```cmd
scripts\build.bat
```

**macOS/Linux**：
```bash
./scripts/build.sh
```

打包后的文件位于 `exe/` 目录：
- Windows: `quest-video.exe`, `adb-manager.exe`
- macOS/Linux: `quest-video`, `adb-manager`

---

## 🔍 故障排除

### 问题 1: 找不到 Node.js

**解决方法**：
1. 访问 https://nodejs.org/ 下载安装
2. 安装后重启终端
3. 验证：`node --version`

### 问题 2: 设备未连接

**解决方法**：
1. 检查 USB 线连接
2. 在设备上允许 USB 调试
3. 运行 `adb devices` 验证连接

### 问题 3: 权限不足 (macOS/Linux)

**解决方法**：
```bash
chmod +x scripts/*.sh
```

---

## 📚 更多文档

- 📖 [完整中文文档](doc/README_CN.md)
- 🚀 [快速开始指南](doc/QUICK_START.md)
- 📜 [脚本使用指南](scripts/README.md)
- 🏗️ [项目结构说明](doc/PROJECT_STRUCTURE.md)
- 🤝 [贡献指南](CONTRIBUTING.md)

---

## 💡 使用技巧

### 1. WiFi 连接 Quest

```bash
# 首次需要 USB 连接
adb tcpip 5555

# 然后可以通过 WiFi 连接（替换为你的 Quest IP）
adb connect 192.168.1.100:5555

# 现在可以拔掉 USB 线了
```

**查找 Quest IP**：
Quest 设置 → WiFi → 点击已连接的网络 → 查看 IP 地址

### 2. 定期备份

创建定时任务，每天自动备份：

**Windows 任务计划程序**：
1. 打开任务计划程序
2. 创建基本任务
3. 选择 `scripts\start-quest.bat`
4. 设置每天运行

**macOS/Linux cron**：
```bash
# 编辑 crontab
crontab -e

# 添加：每天凌晨 2 点运行
0 2 * * * /path/to/EasyADB/scripts/start-quest.sh
```

### 3. 自定义配置

编辑 `src/AdbFileManager/config/config.json`：

```json
{
  "presets": [
    {
      "name": "我的配置",
      "remotePath": "/sdcard/DCIM/Camera",
      "localPath": "D:/MyBackup",
      "fileTypes": [".jpg", ".mp4"],
      "recursive": false
    }
  ],
  "currentPreset": 0
}
```

---

## 🆘 获取帮助

- 📖 查看文档：`doc/` 目录
- 🐛 报告问题：[GitHub Issues](https://github.com/pengjugame/EasyADB/issues)
- 💬 提问讨论：[GitHub Discussions](https://github.com/pengjugame/EasyADB/discussions)

---

## ⭐ 支持项目

如果这个项目对你有帮助：
- ⭐ 给项目一个 Star
- 🐛 报告 Bug 和建议
- 🤝 贡献代码
- 📢 分享给朋友

---

**祝你使用愉快！** 🎉

**项目主页**: https://github.com/pengjugame/EasyADB
**许可证**: MIT License
**维护者**: 一只大菜狗
