/**
 * EasyADB - Android Device Manager
 * Universal Android device file management tool
 *
 * Author: 一只大菜狗
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table3');
const dayjs = require('dayjs');

// 国际化支持
const i18n = require('./lib/i18n/i18n');

// ========== 配置管理 ==========

// 获取程序运行目录（exe所在目录或脚本目录）
function getAppDir() {
    // 打包后使用exe所在目录
    const exeDir = path.dirname(process.execPath);
    if (fs.existsSync(path.join(exeDir, 'lib', 'config'))) {
        return exeDir;
    }

    // 开发时总是使用项目根目录（src的上级目录）
    // 因为配置文件在项目根目录的lib/config下
    return path.dirname(__dirname);
}

// 获取配置文件路径（支持打包后的exe）
function getConfigPath() {
    // 开发时直接使用src/lib/config/config.json
    const configPath = path.join(__dirname, 'lib', 'config', 'config.json');

    // 确保config目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    return configPath;
}

// 加载配置
function loadConfig() {
    const configPath = getConfigPath();
    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(chalk.red(`无法加载配置文件: ${configPath}`));
        console.error(chalk.yellow('使用默认配置...'));
        return getDefaultConfig();
    }
}

// 内置默认配置（完整版，用于缺失配置文件时）
function getDefaultConfig() {
    return {
        app: {
            name: "EasyADB",
            version: "1.0.0",
            author: "一只大菜狗"
        },
        device: {
            name: "Android Device",
            remotePath: "/sdcard/",
            fileExtensions: ["*"]
        },
        import: {
            localFolder: "Videos",
            folderNameFormat: "YYYY-MM-DD",
            useSubfolderByDate: true
        },
        display: {
            dateFormat: "YYYY-MM-DD HH:mm",
            extractAppNameFromFilename: true,
            appNameSegments: 2
        },
        presets: {
            MetaQuest3_Videos: {
                name: "Meta Quest 录屏",
                remotePath: "/sdcard/oculus/VideoShots",
                fileExtensions: [".mp4"]
            },
            MetaQuest3_Screenshots: {
                name: "Meta Quest 截图",
                remotePath: "/sdcard/oculus/Screenshots",
                fileExtensions: [".jpg", ".png"]
            },
            Android_DCIM: {
                name: "安卓相册",
                remotePath: "/sdcard/DCIM/Camera",
                fileExtensions: [".jpg", ".png", ".mp4"]
            },
            Android_Download: {
                name: "安卓下载",
                remotePath: "/sdcard/Download",
                fileExtensions: ["*"]
            }
        }
    };
}

// 获取默认配置文件路径
function getDefaultConfigPath() {
    const appDir = getAppDir();
    return path.join(appDir, 'config', 'config.default.json');
}

// 恢复默认配置
function restoreDefaultConfig() {
    const defaultPath = getDefaultConfigPath();

    // 优先从文件读取默认配置
    if (fs.existsSync(defaultPath)) {
        try {
            const content = fs.readFileSync(defaultPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            // 文件损坏，使用内置默认
        }
    }

    // 回退到内置默认配置
    return getDefaultConfig();
}

// 保存配置
function saveConfig(config) {
    const configPath = getConfigPath();
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(chalk.red(`无法保存配置: ${error.message}`));
        return false;
    }
}

// 全局配置
let CONFIG = loadConfig();

// ========== ADB 路径管理 ==========

// 获取 ADB 可执行文件路径
function getAdbPath() {
    const appDir = getAppDir();

    // 优先使用本地 adb 目录
    const localAdb = path.join(appDir, 'adb', 'adb.exe');
    if (fs.existsSync(localAdb)) {
        return `"${localAdb}"`;
    }

    // 回退到系统 PATH
    return 'adb';
}

// 检查本地 ADB 是否存在
function hasLocalAdb() {
    const appDir = getAppDir();
    const localAdb = path.join(appDir, 'adb', 'adb.exe');
    return fs.existsSync(localAdb);
}

// 获取 ADB 路径信息（用于显示）
function getAdbInfo() {
    const appDir = getAppDir();
    const localAdb = path.join(appDir, 'adb', 'adb.exe');

    if (fs.existsSync(localAdb)) {
        return { type: '本地', path: path.join(appDir, 'adb') };
    }
    return { type: '系统', path: 'PATH 环境变量' };
}

// 全局 ADB 路径
const ADB_PATH = getAdbPath();

// ========== 文件类 ==========

class RemoteFile {
    constructor(fullPath, size, date, config) {
        this.fullPath = fullPath;
        this.size = size;
        this.date = date;
        this.config = config;

        // 从路径中获取文件名
        const pathParts = fullPath.split('/');
        this.fileName = pathParts[pathParts.length - 1];

        // 从文件名提取应用名/来源
        this.sourceName = this._extractSourceName(this.fileName);
    }

    // 从文件名提取来源名称
    _extractSourceName(fileName) {
        if (!this.config.display.extractAppNameFromFilename) {
            return 'file';
        }

        // 去掉扩展名
        const lastDot = fileName.lastIndexOf('.');
        const nameWithoutExt = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;

        // 按点分割
        const parts = nameWithoutExt.split('.');
        const segments = this.config.display.appNameSegments || 2;

        if (parts.length >= segments) {
            return parts.slice(0, segments).join('.');
        }
        return parts[0] || 'unknown';
    }

    // 格式化大小显示
    get sizeFormatted() {
        const bytes = this.size;
        if (bytes >= 1024 * 1024 * 1024) {
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        if (bytes >= 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        }
        return bytes + ' B';
    }

    // 格式化日期显示
    get dateFormatted() {
        return dayjs(this.date).format(this.config.display.dateFormat);
    }
}

// ========== ADB 命令 ==========

function adbExec(command, silent = false) {
    try {
        const result = execSync(`${ADB_PATH} ${command}`, {
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return result.trim();
    } catch (error) {
        if (!silent) {
            console.error(chalk.red(`ADB命令失败: ${error.message}`));
        }
        return null;
    }
}

function adbShell(shellCommand, silent = false) {
    const cmd = `${ADB_PATH} shell ${shellCommand}`;
    try {
        const result = execSync(cmd, {
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return result.trim();
    } catch (error) {
        if (!silent) {
            console.error(chalk.red(`ADB Shell命令失败: ${error.message}`));
        }
        return null;
    }
}

// ========== 设备检测 ==========

function checkAdbConnection() {
    const adbInfo = getAdbInfo();

    // 检查 ADB 是否可用
    try {
        execSync(`${ADB_PATH} version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        console.log(chalk.gray(`  🔧 ADB: ${adbInfo.type} (${adbInfo.path})`));
    } catch (error) {
        console.log(chalk.red('\n❌ 找不到 ADB 命令'));

        if (hasLocalAdb()) {
            console.log(chalk.yellow('   本地 ADB 文件可能损坏，请重新复制'));
        } else {
            console.log(chalk.yellow('\n   解决方案:'));
            console.log(chalk.yellow('   方案1: 将 ADB 文件放到程序目录的 adb 文件夹'));
            console.log(chalk.gray('          adb/adb.exe'));
            console.log(chalk.gray('          adb/AdbWinApi.dll'));
            console.log(chalk.gray('          adb/AdbWinUsbApi.dll'));
            console.log(chalk.yellow('\n   方案2: 安装 Android SDK Platform Tools 并添加到 PATH'));
            console.log(chalk.gray('          下载: https://developer.android.com/studio/releases/platform-tools'));
        }
        return false;
    }

    // 获取设备列表
    const devices = adbExec('devices', true);
    if (!devices) {
        console.log(chalk.red('\n❌ ADB 命令执行失败'));
        return false;
    }

    const lines = devices.split('\n').slice(1);
    const connectedDevices = lines.filter(line => line.includes('\tdevice'));
    const unauthorizedDevices = lines.filter(line => line.includes('\tunauthorized'));
    const offlineDevices = lines.filter(line => line.includes('\toffline'));

    // 处理未授权设备
    if (unauthorizedDevices.length > 0) {
        console.log(chalk.yellow('\n⚠️  检测到未授权的设备'));
        console.log(chalk.cyan('\n   请在设备上完成授权:'));
        console.log(chalk.white('   1. 查看设备屏幕，应该有 USB 调试授权弹窗'));
        console.log(chalk.white('   2. 勾选「总是允许使用这台计算机进行调试」'));
        console.log(chalk.white('   3. 点击「允许」或「确定」'));
        console.log(chalk.gray('\n   如果没有弹窗，请尝试:'));
        console.log(chalk.gray('   - 重新插拔 USB 数据线'));
        console.log(chalk.gray('   - 在设备的开发者选项中撤销 USB 调试授权，然后重新连接'));
        return false;
    }

    // 处理离线设备
    if (offlineDevices.length > 0 && connectedDevices.length === 0) {
        console.log(chalk.yellow('\n⚠️  设备处于离线状态'));
        console.log(chalk.cyan('   请尝试:'));
        console.log(chalk.white('   1. 重新插拔 USB 数据线'));
        console.log(chalk.white('   2. 在设备上重新启用 USB 调试'));
        console.log(chalk.white('   3. 重启 ADB 服务 (运行: adb kill-server && adb start-server)'));
        return false;
    }

    // 没有设备
    if (connectedDevices.length === 0) {
        console.log(chalk.red(`\n❌ 未检测到设备`));
        console.log(chalk.yellow('\n   请确保:'));
        console.log(chalk.white('   1. 设备已通过 USB 连接到电脑'));
        console.log(chalk.white('   2. 设备已开启 USB 调试 (开发者选项中)'));
        console.log(chalk.white('   3. 使用的是数据线而不是仅充电线'));

        if (unauthorizedDevices.length === 0 && offlineDevices.length === 0) {
            console.log(chalk.gray('\n   对于 Meta Quest:'));
            console.log(chalk.gray('   - 戴上头显，在弹出的对话框中点击「允许」'));
        }
        return false;
    }

    console.log(chalk.green(`  ✓ 已连接设备: ${connectedDevices.length} 台`));
    return true;
}

// ========== 文件列表 ==========

function getFileList() {
    const remotePath = CONFIG.device.remotePath;
    const extensions = CONFIG.device.fileExtensions;

    console.log(chalk.cyan(`\n正在扫描 ${CONFIG.device.name}...`));
    console.log(chalk.gray(`路径: ${remotePath}`));

    const lsResult = adbShell(`ls -laR ${remotePath}`, true);

    if (!lsResult) {
        return [];
    }

    const files = [];
    let currentDir = remotePath;
    const lines = lsResult.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.endsWith(':')) {
            currentDir = trimmedLine.slice(0, -1);
            continue;
        }

        if (!trimmedLine || trimmedLine.startsWith('total')) {
            continue;
        }

        // 解析文件行
        const match = trimmedLine.match(/^[\-rwxd]+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/);

        if (match) {
            const fileName = match[4];

            // 检查文件扩展名
            const matchesExtension = extensions.includes('*') ||
                extensions.some(ext => fileName.toLowerCase().endsWith(ext.toLowerCase()));

            if (matchesExtension) {
                const size = parseInt(match[1]);
                const dateStr = `${match[2]} ${match[3]}`;
                const fullPath = `${currentDir}/${fileName}`;
                const date = new Date(dateStr);

                files.push(new RemoteFile(fullPath, size, date, CONFIG));
            }
        }
    }

    files.sort((a, b) => b.date - a.date);
    console.log(chalk.green(`找到 ${files.length} 个文件`));

    return files;
}

// ========== 显示 ==========

function displayFileTable(files, title = '文件列表') {
    if (files.length === 0) {
        console.log(chalk.yellow('\n没有找到文件'));
        return;
    }

    const table = new Table({
        head: [
            chalk.cyan('#'),
            chalk.cyan('日期'),
            chalk.cyan('来源'),
            chalk.cyan('文件名'),
            chalk.cyan('大小')
        ],
        colWidths: [5, 18, 20, 40, 12]
    });

    let totalSize = 0;
    files.forEach((file, index) => {
        totalSize += file.size;
        table.push([
            index + 1,
            file.dateFormatted,
            file.sourceName.substring(0, 18),
            file.fileName.substring(0, 38),
            file.sizeFormatted
        ]);
    });

    console.log(chalk.green(`\n=== ${title} (共 ${files.length} 个) ===`));
    console.log(table.toString());

    const totalSizeStr = totalSize >= 1024 * 1024 * 1024
        ? (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
        : (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
    console.log(chalk.cyan(`总大小: ${totalSizeStr}`));
}

// ========== 筛选 ==========

function getSourceNames(files) {
    const sources = new Set();
    files.forEach(f => sources.add(f.sourceName));
    return Array.from(sources).sort();
}

function getUniqueDates(files) {
    const dates = new Set();
    files.forEach(f => dates.add(dayjs(f.date).format('YYYY-MM-DD')));
    return Array.from(dates).sort().reverse();
}

function filterFiles(files, filters) {
    let result = [...files];

    if (filters.sources && filters.sources.length > 0) {
        result = result.filter(f => filters.sources.includes(f.sourceName));
    }

    if (filters.dates && filters.dates.length > 0) {
        result = result.filter(f => {
            const fileDate = dayjs(f.date).format('YYYY-MM-DD');
            return filters.dates.includes(fileDate);
        });
    }

    if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        result = result.filter(f => {
            const d = dayjs(f.date);
            return d.isAfter(start) && d.isBefore(end);
        });
    }

    return result;
}

// ========== 导入 ==========

async function importFiles(files) {
    if (files.length === 0) {
        console.log(chalk.yellow('没有要导入的文件'));
        return;
    }

    // 创建本地目录
    let localDir;
    if (CONFIG.import.useSubfolderByDate) {
        const folderName = dayjs().format(CONFIG.import.folderNameFormat);
        localDir = path.join(process.cwd(), CONFIG.import.localFolder, folderName);
    } else {
        localDir = path.join(process.cwd(), CONFIG.import.localFolder);
    }

    if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
    }

    console.log(chalk.cyan(`\n开始导入 ${files.length} 个文件到: ${localDir}`));

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        process.stdout.write(chalk.cyan(`[${i + 1}/${files.length}] ${file.fileName}... `));

        const localPath = path.join(localDir, file.fileName);

        try {
            execSync(`adb pull "${file.fullPath}" "${localPath}"`, {
                encoding: 'utf-8',
                maxBuffer: 50 * 1024 * 1024,
                windowsHide: true
            });

            if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
                console.log(chalk.green('✓'));
                success++;
            } else {
                console.log(chalk.red('✗'));
                failed++;
            }
        } catch (error) {
            const errMsg = error.stderr ? error.stderr.toString().trim() : error.message;
            console.log(chalk.red(`✗ (${errMsg.substring(0, 40)})`));
            failed++;
        }
    }

    console.log(chalk.green(`\n导入完成: ${success} 成功, ${failed} 失败`));
    console.log(chalk.cyan(`保存位置: ${localDir}`));
}

// ========== 删除 ==========

async function deleteFiles(files) {
    if (files.length === 0) {
        console.log(chalk.yellow('没有要删除的文件'));
        return;
    }

    console.log(chalk.red(`\n开始删除 ${files.length} 个文件...`));

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        process.stdout.write(chalk.yellow(`[${i + 1}/${files.length}] ${file.fileName}... `));

        adbShell(`rm "${file.fullPath}"`, true);

        const checkResult = adbShell(`ls "${file.fullPath}" 2>/dev/null`, true);
        if (!checkResult || checkResult.includes('No such file')) {
            console.log(chalk.green('✓'));
            success++;
        } else {
            console.log(chalk.red('✗'));
            failed++;
        }
    }

    console.log(chalk.green(`\n删除完成: ${success} 成功, ${failed} 失败`));
}

// ========== 筛选菜单 ==========

function getDateQuickChoices() {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    return [
        { name: '↩️  返回上级', value: 'back' },
        new inquirer.Separator('────────────'),
        { name: `今天 (${today})`, value: 'today', dates: [today] },
        { name: `昨天 (${yesterday})`, value: 'yesterday', dates: [yesterday] },
        { name: '最近3天', value: 'last3days', dateRange: { start: dayjs().subtract(3, 'day'), end: dayjs().add(1, 'day') } },
        { name: '最近7天', value: 'last7days', dateRange: { start: dayjs().subtract(7, 'day'), end: dayjs().add(1, 'day') } },
        { name: '选择具体日期...', value: 'custom' }
    ];
}

async function selectFilters(files, action) {
    const sources = getSourceNames(files);
    const dates = getUniqueDates(files);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalSizeStr = totalSize >= 1024 * 1024 * 1024
        ? (totalSize / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
        : (totalSize / (1024 * 1024)).toFixed(1) + 'MB';

    const { filterType } = await inquirer.prompt([{
        type: 'list',
        name: 'filterType',
        message: '选择筛选方式:',
        choices: [
            { name: '↩️  返回上级', value: 'back' },
            new inquirer.Separator('────────────'),
            { name: `🚀 全部${action} (${files.length}个, ${totalSizeStr})`, value: 'all' },
            { name: '📅 按日期筛选', value: 'date' },
            { name: '📦 按来源筛选', value: 'source' },
            { name: '🎯 同时按日期和来源', value: 'both' },
            { name: '✅ 手动勾选', value: 'manual' }
        ]
    }]);

    if (filterType === 'back') return null;

    // 全选直接返回所有文件（不需要再手动勾选）
    if (filterType === 'all') return files;

    // 手动勾选模式，直接进入手动选择
    if (filterType === 'manual') {
        displayFileTable(files, '所有文件');

        console.log(chalk.gray('  操作: 空格=选择  A=全选  回车=确认  (不选直接回车=返回)'));
        const { selectedFiles } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selectedFiles',
            message: `选择要${action}的文件:`,
            choices: files.map((f, i) => ({
                name: `[${f.dateFormatted}] ${f.sourceName} / ${f.fileName} (${f.sizeFormatted})`,
                value: i,
                short: f.fileName
            })),
            pageSize: 20
        }]);

        return selectedFiles.map(i => files[i]);
    }

    let filters = {};

    if (filterType === 'date' || filterType === 'both') {
        const dateChoices = getDateQuickChoices();
        const { dateOption } = await inquirer.prompt([{
            type: 'list',
            name: 'dateOption',
            message: '选择日期范围:',
            choices: dateChoices
        }]);

        if (dateOption === 'back') return null;

        const selected = dateChoices.find(c => c.value === dateOption);

        if (dateOption === 'custom') {
            console.log(chalk.gray('  操作: 空格=选择  A=全选  回车=确认  (不选直接回车=返回)'));
            const { selectedDates } = await inquirer.prompt([{
                type: 'checkbox',
                name: 'selectedDates',
                message: '选择日期:',
                choices: dates.map(d => ({ name: d, value: d })),
                pageSize: 15
            }]);
            if (selectedDates.length === 0) return null;
            filters.dates = selectedDates;
        } else if (selected && selected.dates) {
            filters.dates = selected.dates;
        } else if (selected && selected.dateRange) {
            filters.dateRange = selected.dateRange;
        }
    }

    if (filterType === 'source' || filterType === 'both') {
        const sourceCounts = {};
        files.forEach(f => {
            sourceCounts[f.sourceName] = (sourceCounts[f.sourceName] || 0) + 1;
        });

        console.log(chalk.gray('  操作: 空格=选择  A=全选  回车=确认  (不选直接回车=返回)'));
        const { selectedSources } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selectedSources',
            message: '选择来源:',
            choices: sources.map(s => ({
                name: `${s} (${sourceCounts[s]} 个)`,
                value: s
            })),
            pageSize: 15
        }]);
        filters.sources = selectedSources;
    }

    let filteredFiles = filterFiles(files, filters);

    if (filteredFiles.length === 0) {
        console.log(chalk.yellow('\n没有符合筛选条件的文件'));
        return [];
    }

    // 显示筛选结果并让用户确认选择
    displayFileTable(filteredFiles, '筛选结果');

    console.log(chalk.gray('  操作: 空格=选择  A=全选  回车=确认  (不选直接回车=返回)'));
    const { selectedFiles } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selectedFiles',
        message: `选择要${action}的文件:`,
        choices: filteredFiles.map((f, i) => ({
            name: `[${f.dateFormatted}] ${f.sourceName} / ${f.fileName} (${f.sizeFormatted})`,
            value: i,
            short: f.fileName
        })),
        pageSize: 20
    }]);

    return selectedFiles.map(i => filteredFiles[i]);
}

// ========== 清理 ==========

async function cleanupDevice(files) {
    const { keepDays } = await inquirer.prompt([{
        type: 'list',
        name: 'keepDays',
        message: '保留最近几天的文件?',
        choices: [
            { name: '↩️  返回上级', value: 'back' },
            new inquirer.Separator('────────────'),
            { name: '保留今天', value: 0 },
            { name: '保留最近3天', value: 3 },
            { name: '保留最近7天', value: 7 },
            { name: '保留最近14天', value: 14 },
            { name: '保留最近30天', value: 30 },
            new inquirer.Separator('────────────'),
            { name: '⚠️  全部删除', value: -1 }
        ]
    }]);

    if (keepDays === 'back') return;

    let toDelete;
    if (keepDays === -1) {
        toDelete = files;
    } else {
        const cutoffDate = dayjs().subtract(keepDays, 'day').startOf('day');
        toDelete = files.filter(f => dayjs(f.date).isBefore(cutoffDate));
    }

    if (toDelete.length === 0) {
        console.log(chalk.yellow('\n没有符合条件的文件需要删除'));
        return;
    }

    displayFileTable(toDelete, '将要删除的文件');

    const totalSize = toDelete.reduce((sum, f) => sum + f.size, 0);
    const sizeStr = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    console.log(chalk.red(`\n⚠️  将删除 ${toDelete.length} 个文件，释放 ${sizeStr} GB`));

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: '确认删除?',
        default: false
    }]);

    if (confirm) {
        await deleteFiles(toDelete);
    } else {
        console.log(chalk.yellow('已取消'));
    }
}

// ========== 设置菜单 ==========

async function confirmAndSaveConfig(config, message = '确认保存设置?') {
    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: message,
        default: true
    }]);

    if (confirm) {
        if (saveConfig(config)) {
            console.log(chalk.green('✓ 设置已保存'));
            return true;
        }
    } else {
        console.log(chalk.yellow('已取消'));
    }
    return false;
}

async function settingsMenu() {
    const presetKeys = Object.keys(CONFIG.presets);
    const configPath = getConfigPath();

    while (true) {
        console.log('');
        console.log(chalk.gray(`  配置文件: ${configPath}`));
        console.log('');

        const { setting } = await inquirer.prompt([{
            type: 'list',
            name: 'setting',
            message: '设置:',
            choices: [
                { name: '↩️  返回上级', value: 'back' },
                new inquirer.Separator('── 当前配置 ──'),
                { name: `📱 设备名称: ${CONFIG.device.name}`, value: 'device' },
                { name: `📂 远程路径: ${CONFIG.device.remotePath}`, value: 'path' },
                { name: `📄 文件类型: ${CONFIG.device.fileExtensions.join(', ')}`, value: 'extensions' },
                new inquirer.Separator('── 快速切换 ──'),
                ...presetKeys.map(key => ({
                    name: `🔹 ${CONFIG.presets[key].name}`,
                    value: `preset_${key}`
                })),
                new inquirer.Separator('── 其它 ──'),
                { name: '🔄 恢复默认配置', value: 'restore' }
            ]
        }]);

        if (setting === 'back') {
            return; // 返回但不重启
        }

        if (setting === 'restore') {
            console.log(chalk.yellow('\n⚠️  这将恢复所有设置为默认值'));

            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: '确认恢复默认配置?',
                default: false
            }]);

            if (confirm) {
                CONFIG = restoreDefaultConfig();
                if (saveConfig(CONFIG)) {
                    console.log(chalk.green('✓ 已恢复默认配置'));
                }
            } else {
                console.log(chalk.yellow('已取消'));
            }
            continue;
        }

        if (setting.startsWith('preset_')) {
            const presetKey = setting.replace('preset_', '');
            const preset = CONFIG.presets[presetKey];

            console.log(chalk.cyan(`\n将切换到: ${preset.name}`));
            console.log(chalk.gray(`  路径: ${preset.remotePath}`));
            console.log(chalk.gray(`  类型: ${preset.fileExtensions.join(', ')}`));

            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: '确认切换?',
                default: true
            }]);

            if (confirm) {
                CONFIG.device.name = preset.name;
                CONFIG.device.remotePath = preset.remotePath;
                CONFIG.device.fileExtensions = preset.fileExtensions;
                saveConfig(CONFIG);
                console.log(chalk.green(`✓ 已切换到: ${preset.name}`));
            }
            continue;
        }

        if (setting === 'device') {
            const { newName } = await inquirer.prompt([{
                type: 'input',
                name: 'newName',
                message: '设备名称:',
                default: CONFIG.device.name
            }]);

            if (newName !== CONFIG.device.name) {
                CONFIG.device.name = newName;
                await confirmAndSaveConfig(CONFIG);
            }
            continue;
        }

        if (setting === 'path') {
            const { newPath } = await inquirer.prompt([{
                type: 'input',
                name: 'newPath',
                message: '远程路径:',
                default: CONFIG.device.remotePath
            }]);

            if (newPath !== CONFIG.device.remotePath) {
                CONFIG.device.remotePath = newPath;
                await confirmAndSaveConfig(CONFIG);
            }
            continue;
        }

        if (setting === 'extensions') {
            const { newExt } = await inquirer.prompt([{
                type: 'input',
                name: 'newExt',
                message: '文件扩展名 (逗号分隔, * 表示全部):',
                default: CONFIG.device.fileExtensions.join(', ')
            }]);

            const newExtArray = newExt.split(',').map(e => e.trim());
            if (JSON.stringify(newExtArray) !== JSON.stringify(CONFIG.device.fileExtensions)) {
                CONFIG.device.fileExtensions = newExtArray;
                await confirmAndSaveConfig(CONFIG);
            }
            continue;
        }
    }
}

// ========== 主菜单 ==========

async function mainMenu() {
    // 显示标题
    const title = CONFIG.app.name;
    const version = CONFIG.app.version;
    const author = CONFIG.app.author;
    const configPath = getConfigPath();

    console.log('');
    console.log(chalk.cyan(' ███████╗ █████╗ ███████╗██╗   ██╗ █████╗ ██████╗ ██████╗ '));
    console.log(chalk.cyan(' ██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝██╔══██╗██╔══██╗██╔══██╗'));
    console.log(chalk.cyan(' █████╗  ███████║███████╗ ╚████╔╝ ███████║██████╔╝██████╔╝'));
    console.log(chalk.cyan(' ██╔══╝  ██╔══██║╚════██║  ╚██╔╝  ██╔══██║██╔══██╗██╔══██╗'));
    console.log(chalk.cyan(' ███████╗██║  ██║███████║   ██║   ██║  ██║██████╔╝██████╔╝'));
    console.log(chalk.cyan(' ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═════╝ ╚═════╝ '));
    console.log('');
    console.log(chalk.white(`  ${title}`));
    console.log(chalk.gray(`  v${version}  by ${author}`));
    console.log(chalk.gray('  ─────────────────────────────────────────'));
    console.log(chalk.yellow(`  📱 ${CONFIG.device.name}`));
    console.log(chalk.gray(`  📂 ${CONFIG.device.remotePath}`));
    console.log(chalk.gray(`  📄 ${CONFIG.device.fileExtensions.join(', ')}`));
    console.log(chalk.gray(`  ⚙️  ${configPath}`));
    console.log('');

    if (!checkAdbConnection()) {
        const { retry } = await inquirer.prompt([{
            type: 'confirm',
            name: 'retry',
            message: '是否重试?',
            default: true
        }]);
        if (retry) return mainMenu();
        return;
    }

    let files = getFileList();

    if (files.length === 0) {
        console.log(chalk.yellow('\n设备上没有找到文件'));
        console.log(chalk.cyan(`检查路径: ${CONFIG.device.remotePath}`));

        const { goSettings } = await inquirer.prompt([{
            type: 'confirm',
            name: 'goSettings',
            message: '是否进入设置修改路径?',
            default: true
        }]);

        if (goSettings) {
            await settingsMenu();
            return mainMenu(); // 设置后重新加载文件
        }
        return;
    }

    console.log(chalk.cyan(`\n发现 ${files.length} 个文件`));

    while (true) {
        const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: '请选择操作:',
            choices: [
                { name: '📋 查看文件列表', value: 'list' },
                { name: '📥 导入文件到电脑', value: 'import' },
                { name: '🗑️  删除设备文件', value: 'delete' },
                { name: '🧹 清理设备（保留最近X天）', value: 'cleanup' },
                { name: '⚙️  设置', value: 'settings' },
                { name: '🔄 刷新', value: 'refresh' },
                { name: '❌ 退出', value: 'exit' }
            ],
            pageSize: 10
        }]);

        switch (action) {
            case 'list':
                displayFileTable(files);
                break;

            case 'import':
                const toImport = await selectFilters(files, '导入');
                if (toImport && toImport.length > 0) {
                    const { confirm } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: `确认导入 ${toImport.length} 个文件?`,
                        default: true
                    }]);
                    if (confirm) await importFiles(toImport);
                }
                break;

            case 'delete':
                const toDelete = await selectFilters(files, '删除');
                if (toDelete && toDelete.length > 0) {
                    const totalSize = toDelete.reduce((sum, f) => sum + f.size, 0);
                    const sizeStr = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
                    console.log(chalk.red(`\n⚠️  将删除 ${toDelete.length} 个文件，释放 ${sizeStr} GB`));

                    const { confirm } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: '确认删除? (不可恢复)',
                        default: false
                    }]);

                    if (confirm) {
                        await deleteFiles(toDelete);
                        toDelete.forEach(f => {
                            const index = files.indexOf(f);
                            if (index > -1) files.splice(index, 1);
                        });
                    }
                }
                break;

            case 'cleanup':
                await cleanupDevice(files);
                break;

            case 'settings':
                await settingsMenu();
                // 设置后重新加载文件列表（因为路径可能变了）
                console.log(chalk.cyan('\n重新加载文件列表...'));
                files = getFileList();
                if (files.length === 0) {
                    console.log(chalk.yellow('设备上没有找到文件'));
                } else {
                    console.log(chalk.cyan(`发现 ${files.length} 个文件`));
                }
                break;

            case 'refresh':
                return mainMenu();

            case 'exit':
                console.log(chalk.green(`\n再见! 👋  -- ${author}\n`));
                process.exit(0);
        }
    }
}

// ========== 启动 ==========

// 初始化国际化
const configPath = getConfigPath();
i18n.init(configPath);

mainMenu().catch(err => {
    console.error(chalk.red('发生错误:'), err.message);
    process.exit(1);
});
