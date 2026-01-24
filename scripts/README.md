# EasyADB 脚本说明

## 📁 可用脚本

### Windows (.bat)
- `start.bat` - **启动EasyADB** (Android设备管理器)
- `install.bat` - 安装项目依赖
- `build.bat` - 打包为可执行文件

### macOS/Linux (.sh)
- `start.sh` - **启动EasyADB** (Android设备管理器)
- `install.sh` - 安装项目依赖
- `build.sh` - 打包为可执行文件

## 🚀 快速使用

**Windows**:
```cmd
# 安装依赖 (首次运行)
scripts\install.bat

# 启动程序
scripts\start.bat
```

**macOS/Linux**:
```bash
# 安装依赖 (首次运行)
chmod +x scripts/*.sh
scripts/install.sh

# 启动程序
scripts/start.sh
```

## 📦 打包发布

```bash
# 打包为独立可执行文件
scripts\build.bat    # Windows
scripts/build.sh     # macOS/Linux
```

## 🔧 故障排除

- **找不到 Node.js**: 下载安装 https://nodejs.org/
- **依赖安装失败**: `npm cache clean --force` 后重试
- **权限问题**: Windows用管理员运行，Linux用 `chmod +x`

---

**最后更新**: 2026-01-24
