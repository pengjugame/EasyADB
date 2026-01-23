# EasyADB 脚本使用指南

本目录包含了 EasyADB 项目的便捷脚本，支持 Windows、macOS 和 Linux 平台。

## 📁 脚本列表

### Windows 脚本 (.bat)

| 脚本名称 | 用途 | 说明 |
|---------|------|------|
| `install.bat` | 安装依赖 | 安装项目所需的 Node.js 依赖包 |
| `start-quest.bat` | 启动 Quest 工具 | 运行 Quest 视频管理工具 |
| `start-manager.bat` | 启动管理器 | 运行通用 ADB 文件管理器 |
| `build.bat` | 打包程序 | 将项目打包为 Windows 可执行文件 |

### macOS/Linux 脚本 (.sh)

| 脚本名称 | 用途 | 说明 |
|---------|------|------|
| `install.sh` | 安装依赖 | 安装项目所需的 Node.js 依赖包 |
| `start-quest.sh` | 启动 Quest 工具 | 运行 Quest 视频管理工具 |
| `start-manager.sh` | 启动管理器 | 运行通用 ADB 文件管理器 |
| `build.sh` | 打包程序 | 将项目打包为可执行文件 |

## 🚀 快速开始

### Windows 用户

1. **首次使用 - 安装依赖**
   ```cmd
   双击运行 install.bat
   ```

2. **启动 Quest 视频管理工具**
   ```cmd
   双击运行 start-quest.bat
   ```

3. **启动通用 ADB 管理器**
   ```cmd
   双击运行 start-manager.bat
   ```

4. **打包为可执行文件**
   ```cmd
   双击运行 build.bat
   ```

### macOS/Linux 用户

1. **首次使用 - 安装依赖**
   ```bash
   cd scripts
   chmod +x *.sh  # 添加执行权限（首次需要）
   ./install.sh
   ```

2. **启动 Quest 视频管理工具**
   ```bash
   ./start-quest.sh
   ```

3. **启动通用 ADB 管理器**
   ```bash
   ./start-manager.sh
   ```

4. **打包为可执行文件**
   ```bash
   ./build.sh
   ```

## 📖 详细说明

### 1. install - 安装依赖

**用途**: 安装项目运行所需的 Node.js 依赖包

**前置要求**:
- 已安装 Node.js 14.0 或更高版本
- 已安装 npm（随 Node.js 一起安装）

**执行内容**:
- 进入 `src/` 目录
- 运行 `npm install`
- 安装 inquirer, chalk, dayjs, cli-table3 等依赖

**使用场景**:
- 首次使用项目
- 更新依赖包
- 依赖包损坏需要重新安装

**Windows**:
```cmd
scripts\install.bat
```

**macOS/Linux**:
```bash
scripts/install.sh
```

---

### 2. start-quest - 启动 Quest 视频管理工具

**用途**: 运行 Meta Quest 视频管理工具

**前置要求**:
- 已安装 Node.js
- 已运行 `install` 脚本安装依赖
- Quest 设备已连接并启用 USB 调试

**执行内容**:
- 检查 Node.js 是否安装
- 检查依赖是否安装（未安装则自动安装）
- 运行 `node quest-video.js`

**功能特性**:
- 扫描 Quest 设备上的录屏和截图
- 导出视频到本地（按日期分类）
- 删除设备上的视频
- 清理设备（保留最近 N 天）

**Windows**:
```cmd
scripts\start-quest.bat
```

**macOS/Linux**:
```bash
scripts/start-quest.sh
```

---

### 3. start-manager - 启动通用 ADB 管理器

**用途**: 运行通用 ADB 文件管理器

**前置要求**:
- 已安装 Node.js
- 已运行 `install` 脚本安装依赖
- Android 设备已连接并启用 USB 调试

**执行内容**:
- 检查 Node.js 是否安装
- 检查依赖是否安装（未安装则自动安装）
- 运行 `node adb-manager.js`

**功能特性**:
- 管理任意 Android 设备的文件
- 支持多个预设配置
- 灵活的文件类型过滤
- 递归目录扫描

**Windows**:
```cmd
scripts\start-manager.bat
```

**macOS/Linux**:
```bash
scripts/start-manager.sh
```

---

### 4. build - 打包为可执行文件

**用途**: 将项目打包为独立的可执行文件

**前置要求**:
- 已安装 Node.js
- 已安装 npm

**执行内容**:
1. 检查并安装依赖
2. 安装 pkg 打包工具
3. 打包 quest-video 和 adb-manager
4. 复制配置文件到输出目录
5. 添加执行权限（macOS/Linux）

**输出文件**:

**Windows**:
```
exe/
├── quest-video.exe
├── adb-manager.exe
└── AdbFileManager/
    └── config/
        ├── config.json
        └── config.default.json
```

**macOS/Linux**:
```
exe/
├── quest-video
├── adb-manager
└── AdbFileManager/
    └── config/
        ├── config.json
        └── config.default.json
```

**使用打包后的文件**:
- Windows: 双击 `.exe` 文件运行
- macOS/Linux: 在终端运行 `./quest-video` 或 `./adb-manager`

**Windows**:
```cmd
scripts\build.bat
```

**macOS/Linux**:
```bash
scripts/build.sh
```

---

## 🔧 故障排除

### 问题 1: 找不到 Node.js

**症状**:
```
[错误] 未找到 Node.js
```

**解决方法**:
1. 访问 https://nodejs.org/ 下载并安装 Node.js
2. 安装后重启终端
3. 验证安装: `node --version`

---

### 问题 2: 权限不足 (macOS/Linux)

**症状**:
```
Permission denied
```

**解决方法**:
```bash
chmod +x scripts/*.sh
```

---

### 问题 3: npm install 失败

**症状**:
```
npm ERR! ...
```

**解决方法**:
1. 检查网络连接
2. 清除 npm 缓存: `npm cache clean --force`
3. 删除 `node_modules` 文件夹后重试
4. 尝试使用国内镜像:
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

---

### 问题 4: 打包失败

**症状**:
```
[错误] 打包失败！
```

**解决方法**:
1. 确保已安装所有依赖: `npm install`
2. 检查磁盘空间是否充足
3. 尝试手动安装 pkg: `npm install -g pkg`
4. 清除缓存后重试: `npm cache clean --force`

---

### 问题 5: 脚本无法运行 (Windows)

**症状**:
```
'node' 不是内部或外部命令
```

**解决方法**:
1. 确保 Node.js 已添加到系统 PATH
2. 重启命令提示符
3. 以管理员身份运行脚本

---

## 💡 使用技巧

### 1. 创建桌面快捷方式 (Windows)

右键点击脚本 → 发送到 → 桌面快捷方式

### 2. 添加到 PATH (macOS/Linux)

```bash
# 在 ~/.bashrc 或 ~/.zshrc 中添加
export PATH="$PATH:/path/to/EasyADB/scripts"

# 然后可以直接运行
start-quest.sh
```

### 3. 自动化运行

**Windows 任务计划程序**:
1. 打开任务计划程序
2. 创建基本任务
3. 选择脚本文件
4. 设置触发器（每天、每周等）

**macOS/Linux cron**:
```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨 2 点运行）
0 2 * * * /path/to/EasyADB/scripts/start-quest.sh
```

### 4. 批量操作

创建自定义脚本组合多个操作：

**Windows (custom.bat)**:
```batch
@echo off
call scripts\install.bat
call scripts\start-quest.bat
```

**macOS/Linux (custom.sh)**:
```bash
#!/bin/bash
./scripts/install.sh
./scripts/start-quest.sh
```

---

## 📝 脚本开发

### 添加新脚本

1. **Windows (.bat)**:
   ```batch
   @echo off
   chcp 65001 >nul
   cd /d "%~dp0\.."

   echo 你的脚本内容

   pause
   ```

2. **macOS/Linux (.sh)**:
   ```bash
   #!/bin/bash
   cd "$(dirname "$0")/.."

   echo "你的脚本内容"
   ```

### 脚本规范

- 使用 UTF-8 编码
- Windows 脚本使用 CRLF 换行符
- macOS/Linux 脚本使用 LF 换行符
- 添加清晰的注释和错误处理
- 提供友好的用户提示

---

## 🔗 相关文档

- [项目主文档](../README.md)
- [快速开始指南](../doc/QUICK_START.md)
- [项目结构说明](../doc/PROJECT_STRUCTURE.md)
- [打包说明](../exe/README.md)

---

## 📞 获取帮助

如果遇到问题：

1. 查看本文档的故障排除部分
2. 查看 [快速开始指南](../doc/QUICK_START.md)
3. 在 GitHub 上提交 Issue

---

**最后更新**: 2026-01-23

**维护者**: 一只大菜狗
