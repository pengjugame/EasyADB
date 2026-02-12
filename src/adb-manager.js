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
            console.log(chalk.yellow(`   ${i18n.t('adb.local_adb_corrupt')}`));
        } else {
            console.log(chalk.yellow(`\n   ${i18n.t('adb.solutions')}:`));
            console.log(chalk.yellow(`   ${i18n.t('adb.solution1')}`));
            console.log(chalk.gray('          adb/adb.exe'));
            console.log(chalk.gray('          adb/AdbWinApi.dll'));
            console.log(chalk.gray('          adb/AdbWinUsbApi.dll'));
            console.log(chalk.yellow(`\n   ${i18n.t('adb.solution2')}`));
            console.log(chalk.gray(`          ${i18n.t('adb.download_url')}`));
        }
        return false;
    }

    // 获取设备列表
    const devices = adbExec('devices', true);
    if (!devices) {
        console.log(chalk.red(`\n❌ ${i18n.t('adb.command_failed')}`));
        return false;
    }

    const lines = devices.split('\n').slice(1);
    const connectedDevices = lines.filter(line => line.includes('\tdevice'));
    const unauthorizedDevices = lines.filter(line => line.includes('\tunauthorized'));
    const offlineDevices = lines.filter(line => line.includes('\toffline'));

    // 处理未授权设备
    if (unauthorizedDevices.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${i18n.t('adb.unauthorized_title')}`));
        console.log(chalk.cyan(`\n   ${i18n.t('adb.unauthorized_desc')}`));
        console.log(chalk.white(`   ${i18n.t('adb.unauthorized_step1')}`));
        console.log(chalk.white(`   ${i18n.t('adb.unauthorized_step2')}`));
        console.log(chalk.white(`   ${i18n.t('adb.unauthorized_step3')}`));
        console.log(chalk.gray(`\n   ${i18n.t('adb.unauthorized_help')}`));
        console.log(chalk.gray(`   ${i18n.t('adb.unauthorized_help1')}`));
        console.log(chalk.gray(`   ${i18n.t('adb.unauthorized_help2')}`));
        return false;
    }

    // 处理离线设备
    if (offlineDevices.length > 0 && connectedDevices.length === 0) {
        console.log(chalk.yellow(`\n⚠️  ${i18n.t('adb.offline_title')}`));
        console.log(chalk.cyan(`   ${i18n.t('adb.offline_desc')}`));
        console.log(chalk.white(`   ${i18n.t('adb.offline_step1')}`));
        console.log(chalk.white(`   ${i18n.t('adb.offline_step2')}`));
        console.log(chalk.white(`   ${i18n.t('adb.offline_step3')}`));
        return false;
    }

    // 没有设备
    if (connectedDevices.length === 0) {
        console.log(chalk.red(`\n❌ ${i18n.t('adb.no_device_title')}`));
        console.log(chalk.yellow(`\n   ${i18n.t('adb.no_device_desc')}`));
        console.log(chalk.white(`   ${i18n.t('adb.no_device_step1')}`));
        console.log(chalk.white(`   ${i18n.t('adb.no_device_step2')}`));
        console.log(chalk.white(`   ${i18n.t('adb.no_device_step3')}`));

        if (unauthorizedDevices.length === 0 && offlineDevices.length === 0) {
            console.log(chalk.gray(`\n   ${i18n.t('adb.quest_help')}`));
            console.log(chalk.gray(`   ${i18n.t('adb.quest_help1')}`));
        }
        return false;
    }

    console.log(chalk.green(`  ✓ ${i18n.t('adb.connected_devices', { count: connectedDevices.length })}`));
    return true;
}

// ========== 文件列表 ==========

function getFileList() {
    const remotePath = CONFIG.device.remotePath;
    const extensions = CONFIG.device.fileExtensions;

    console.log(chalk.cyan(`\n${i18n.t('device.scanning')} ${CONFIG.device.name}...`));
    console.log(chalk.gray(`${i18n.t('file.path')}: ${remotePath}`));

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
                // 使用 dayjs 解析日期，然后转换为 Date 对象，确保解析正确
                const date = dayjs(dateStr, 'YYYY-MM-DD HH:mm').toDate();

                files.push(new RemoteFile(fullPath, size, date, CONFIG));
            }
        }
    }

    files.sort((a, b) => b.date - a.date);
    console.log(chalk.green(i18n.t('device.files_found', { count: files.length })));

    return files;
}

// ========== 显示 ==========

function displayFileTable(files, title = '文件列表') {
    if (files.length === 0) {
        console.log(chalk.yellow(`\n${i18n.t('device.no_files')}`));
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

    console.log(chalk.green(`\n=== ${title} (${files.length} ${i18n.t('file.type')}) ===`));
    console.log(table.toString());

    const totalSizeStr = totalSize >= 1024 * 1024 * 1024
        ? (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
        : (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
    console.log(chalk.cyan(`${i18n.t('file.total_size')}: ${totalSizeStr}`));
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
        console.log(chalk.yellow(i18n.t('file.no_files_to_import')));
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

    console.log(chalk.cyan(`\n${i18n.t('file.starting_import', { count: files.length, dir: localDir })}`));

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

    console.log(chalk.green(`\n${i18n.t('file.import_complete', { success, failed })}`));
    console.log(chalk.cyan(`${i18n.t('file.save_location')}: ${localDir}`));
}

// ========== 删除 ==========

async function deleteFiles(files) {
    if (files.length === 0) {
        console.log(chalk.yellow(i18n.t('file.no_files_to_delete')));
        return;
    }

    console.log(chalk.red(`\n${i18n.t('file.starting_delete', { count: files.length })}`));

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        process.stdout.write(chalk.yellow(`[${i + 1}/${files.length}] ${file.fileName}... `));

        try {
            // 执行删除命令
            const deleteResult = adbShell(`rm "${file.fullPath}"`, true);

            // 如果命令执行失败（返回null），直接标记为失败
            if (deleteResult === null) {
                console.log(chalk.red('✗ (command failed)'));
                failed++;
                continue;
            }

            // 验证文件是否已删除
            const checkResult = adbShell(`ls "${file.fullPath}" 2>/dev/null`, true);
            if (!checkResult || checkResult.includes('No such file')) {
                console.log(chalk.green('✓'));
                success++;
            } else {
                console.log(chalk.red('✗ (still exists)'));
                failed++;
            }
        } catch (error) {
            console.log(chalk.red(`✗ (${error.message})`));
            failed++;
        }
    }

    console.log(chalk.green(`\n${i18n.t('file.delete_complete', { success, failed })}`));
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
        message: i18n.t('file.select_filter_type'),
        choices: [
            { name: `↩️  ${i18n.t('settings.back')}`, value: 'back' },
            new inquirer.Separator('────────────'),
            { name: `🚀 ${i18n.t('file.all_files', { action: action, count: files.length, size: totalSizeStr })}`, value: 'all' },
            { name: `📅 ${i18n.t('file.filter_by_date')}`, value: 'date' },
            { name: `📦 ${i18n.t('file.filter_by_source')}`, value: 'source' },
            { name: `🎯 ${i18n.t('file.filter_by_both')}`, value: 'both' },
            { name: `✅ ${i18n.t('file.manual_select')}`, value: 'manual' }
        ]
    }]);

    if (filterType === 'back') return null;

    // 全选直接返回所有文件（不需要再手动勾选）
    if (filterType === 'all') return files;

    // 手动勾选模式，直接进入手动选择
    if (filterType === 'manual') {
        displayFileTable(files, '所有文件');

        console.log(chalk.gray(`  ${i18n.t('file.operation_guide')}`));
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
            message: i18n.t('file.select_date_range'),
            choices: dateChoices
        }]);

        if (dateOption === 'back') return null;

        const selected = dateChoices.find(c => c.value === dateOption);

        if (dateOption === 'custom') {
            console.log(chalk.gray(`  ${i18n.t('file.operation_guide')}`));
            const { selectedDates } = await inquirer.prompt([{
                type: 'checkbox',
                name: 'selectedDates',
                message: i18n.t('file.select_date'),
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

        console.log(chalk.gray(`  ${i18n.t('file.operation_guide')}`));
        const { selectedSources } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selectedSources',
            message: i18n.t('file.select_source'),
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
        console.log(chalk.yellow(`\n${i18n.t('file.no_files_match')}`));
        return [];
    }

    // 显示筛选结果并让用户确认选择
    displayFileTable(filteredFiles, i18n.t('file.filter_results'));

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
        message: i18n.t('file.keep_days_question'),
        choices: [
            { name: `↩️  ${i18n.t('settings.back')}`, value: 'back' },
            new inquirer.Separator('────────────'),
            { name: i18n.t('file.keep_today'), value: 0 },
            { name: i18n.t('file.keep_last_3_days'), value: 3 },
            { name: i18n.t('file.keep_last_7_days'), value: 7 },
            { name: i18n.t('file.keep_last_14_days'), value: 14 },
            { name: i18n.t('file.keep_last_30_days'), value: 30 },
            new inquirer.Separator('────────────'),
            { name: `⚠️  ${i18n.t('file.delete_all')}`, value: -1 }
        ]
    }]);

    if (keepDays === 'back') return;

    let toDelete;
    if (keepDays === -1) {
        toDelete = files;
    } else {
        const cutoffDate = dayjs().subtract(keepDays, 'day').startOf('day');
        console.log(chalk.gray(`\n📅 ${i18n.t('file.cutoff_date')}: ${cutoffDate.format('YYYY-MM-DD HH:mm:ss')}`));
        console.log(chalk.gray(`📊 ${i18n.t('file.total_files')}: ${files.length}`));

        toDelete = files.filter(f => {
            const fileDate = dayjs(f.date);
            const shouldDelete = fileDate.isBefore(cutoffDate);
            return shouldDelete;
        });

        console.log(chalk.gray(`🗑️  ${i18n.t('file.files_to_delete')}: ${toDelete.length}`));
    }

    if (toDelete.length === 0) {
        console.log(chalk.yellow(`\n${i18n.t('file.no_files_match')}`));
        return;
    }

    displayFileTable(toDelete, '将要删除的文件');

    const totalSize = toDelete.reduce((sum, f) => sum + f.size, 0);
    const sizeStr = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    console.log(chalk.red(`\n⚠️  ${i18n.t('file.cleanup_warning', { count: toDelete.length, size: sizeStr })}`));

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: i18n.t('confirm.delete_files'),
        default: false
    }]);

    if (confirm) {
        await deleteFiles(toDelete);
    } else {
        console.log(chalk.yellow(i18n.t('confirm.cancel')));
    }
}

// ========== 设置菜单 ==========

async function confirmAndSaveConfig(config, message = i18n.t('confirm.save_settings')) {
    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: message,
        default: true
    }]);

    if (confirm) {
        if (saveConfig(config)) {
            console.log(chalk.green(`✓ ${i18n.t('settings.save_success')}`));
            return true;
        }
    } else {
        console.log(chalk.yellow(i18n.t('confirm.cancel')));
    }
    return false;
}

async function settingsMenu() {
    const configPath = getConfigPath();

    while (true) {
        console.log('');
        console.log(chalk.gray(`  ${i18n.t('settings.current_config')}: ${configPath}`));
        console.log('');

        const { setting } = await inquirer.prompt([{
            type: 'list',
            name: 'setting',
            message: i18n.t('settings.title') + ':',
            choices: [
                { name: i18n.t('settings.back'), value: 'back' },
                new inquirer.Separator(`── ${i18n.t('settings.current_config')} ──`),
                { name: `${i18n.t('settings.language')}: ${i18n.getCurrentLanguage().toUpperCase()}`, value: 'language' },
                new inquirer.Separator(`── ${i18n.t('settings.others')} ──`),
                { name: i18n.t('settings.restore_default'), value: 'restore' }
            ]
        }]);

        if (setting === 'back') {
            return;
        }

        if (setting === 'language') {
            const supportedLanguages = i18n.getSupportedLanguages();
            const languageChoices = Object.entries(supportedLanguages).map(([code, name]) => ({
                name: `${name} (${code.toUpperCase()})`,
                value: code
            }));

            const { selectedLanguage } = await inquirer.prompt([{
                type: 'list',
                name: 'selectedLanguage',
                message: i18n.t('language.select_language'),
                choices: languageChoices
            }]);

            if (i18n.switchLanguage(selectedLanguage)) {
                console.log(chalk.green(`✓ ${i18n.t('language.language_changed', { lang: supportedLanguages[selectedLanguage] })}`));
                console.log(chalk.yellow(i18n.t('language.restart_required')));
                return selectDeviceMenu();
            } else {
                console.log(chalk.red(`✗ ${i18n.t('settings.switch_failed')}`));
            }
            continue;
        }

        if (setting === 'restore') {
            console.log(chalk.yellow(`\n⚠️  ${i18n.t('settings.restore_warning')}`));

            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: i18n.t('settings.confirm_restore'),
                default: false
            }]);

            if (confirm) {
                CONFIG = restoreDefaultConfig();
                if (saveConfig(CONFIG)) {
                    console.log(chalk.green(`✓ ${i18n.t('settings.restore_success')}`));
                }
            } else {
                console.log(chalk.yellow(i18n.t('confirm.cancel')));
            }
            continue;
        }
    }
}

// ========== 设备选择菜单 ==========

async function selectDeviceMenu() {
    // Display ASCII banner
    const title = CONFIG.app.name;
    const version = CONFIG.app.version;
    const author = CONFIG.app.author;

    console.log('');
    console.log('  ____   __    __   _     __    ___   ___ ');
    console.log(' | |_   / /\\  ( (` \\ \\_/ / /\\  | | \\ | |_)');
    console.log(' |_|__ /_/--\\ _)_)  |_| /_/--\\ |_|_/ |_|_)');
    console.log('');
    console.log(chalk.white(`  ${title}`));
    console.log(chalk.gray(`  v${version}  by ${author}`));
    console.log(chalk.gray('  ─────────────────────────────────────────'));
    console.log('');

    // Build device choices
    const presetOrder = ['MetaQuest3_Videos', 'MetaQuest3_Screenshots', 'Android_DCIM', 'Android_Download'];
    const choices = [];
    const lastUsed = CONFIG.lastUsedDevice;

    // Add last used device first if it exists and is valid
    if (lastUsed && CONFIG.presets[lastUsed]) {
        const preset = CONFIG.presets[lastUsed];
        choices.push({
            name: `${preset.name} (${preset.remotePath})`,
            value: lastUsed
        });
    }

    // Add remaining presets in order
    for (const key of presetOrder) {
        if (key !== lastUsed && CONFIG.presets[key]) {
            const preset = CONFIG.presets[key];
            choices.push({
                name: `${preset.name} (${preset.remotePath})`,
                value: key
            });
        }
    }

    // Add custom option
    choices.push({
        name: i18n.t('preset.custom'),
        value: 'custom'
    });

    const { selectedDevice } = await inquirer.prompt([{
        type: 'list',
        name: 'selectedDevice',
        message: i18n.t('device.select_device'),
        choices: choices,
        default: 0
    }]);

    if (selectedDevice === 'custom') {
        await customDeviceConfig();
    } else {
        // Load preset into CONFIG.device
        const preset = CONFIG.presets[selectedDevice];
        CONFIG.device.name = preset.name;
        CONFIG.device.remotePath = preset.remotePath;
        CONFIG.device.fileExtensions = preset.fileExtensions;
        CONFIG.lastUsedDevice = selectedDevice;
        saveConfig(CONFIG);
    }

    // Enter main menu
    await mainMenu();
}

async function customDeviceConfig() {
    console.log(chalk.cyan(`\n${i18n.t('device.custom_device')}`));

    const { deviceName } = await inquirer.prompt([{
        type: 'input',
        name: 'deviceName',
        message: i18n.t('device.enter_device_name'),
        default: CONFIG.device.name
    }]);

    const { remotePath } = await inquirer.prompt([{
        type: 'input',
        name: 'remotePath',
        message: i18n.t('device.enter_remote_path'),
        default: CONFIG.device.remotePath
    }]);

    const { extensions } = await inquirer.prompt([{
        type: 'input',
        name: 'extensions',
        message: i18n.t('device.enter_file_extensions'),
        default: CONFIG.device.fileExtensions.join(', ')
    }]);

    // Parse extensions
    const fileExtensions = extensions.split(',').map(ext => ext.trim()).filter(ext => ext.length > 0);

    // Save to CONFIG.device
    CONFIG.device.name = deviceName;
    CONFIG.device.remotePath = remotePath;
    CONFIG.device.fileExtensions = fileExtensions;
    CONFIG.lastUsedDevice = null; // Custom config doesn't have a preset key
    saveConfig(CONFIG);

    console.log(chalk.green(`\n✓ ${i18n.t('settings.save_success')}`));
}

// ========== 主菜单 ==========

async function mainMenu() {
    // Display title banner
    const title = CONFIG.app.name;
    const version = CONFIG.app.version;
    const author = CONFIG.app.author;

    console.log('');
    console.log('  ____   __    __   _     __    ___   ___ ');
    console.log(' | |_   / /\\  ( (` \\ \\_/ / /\\  | | \\ | |_)');
    console.log(' |_|__ /_/--\\ _)_)  |_| /_/--\\ |_|_/ |_|_)');
    console.log('');
    console.log(chalk.white(`  ${title}`));
    console.log(chalk.gray(`  v${version}  by ${author}`));
    console.log(chalk.gray('  ─────────────────────────────────────────'));
    console.log('');

    if (!checkAdbConnection()) {
        const { retry } = await inquirer.prompt([{
            type: 'confirm',
            name: 'retry',
            message: i18n.t('confirm.yes') + '/' + i18n.t('confirm.no').toLowerCase(),
            default: true
        }]);
        if (retry) return mainMenu();
        return;
    }

    let files = getFileList();

    if (files.length === 0) {
        console.log(chalk.yellow(`\n${i18n.t('device.no_files')}`));
        console.log(chalk.cyan(`${i18n.t('device.check_path')}: ${CONFIG.device.remotePath}`));

        const { goSettings } = await inquirer.prompt([{
            type: 'confirm',
            name: 'goSettings',
            message: i18n.t('settings.enter_settings'),
            default: true
        }]);

        if (goSettings) {
            await settingsMenu();
            return mainMenu();
        }
        return;
    }

    console.log(chalk.cyan(`\n${i18n.t('device.file_count', { count: files.length })}`));

    while (true) {
        const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: i18n.t('menu.main_title'),
            choices: [
                { name: i18n.t('menu.scan_device'), value: 'list' },
                { name: i18n.t('menu.export_files'), value: 'import' },
                { name: i18n.t('menu.delete_files'), value: 'delete' },
                { name: i18n.t('menu.cleanup_old'), value: 'cleanup' },
                { name: i18n.t('menu.settings'), value: 'settings' },
                { name: i18n.t('menu.refresh'), value: 'refresh' },
                { name: i18n.t('menu.exit'), value: 'exit' }
            ],
            pageSize: 10
        }]);

        switch (action) {
            case 'list':
                displayFileTable(files);
                // File list operations menu
                const { afterListAction } = await inquirer.prompt([{
                    type: 'list',
                    name: 'afterListAction',
                    message: i18n.t('file.file_list_operations'),
                    choices: [
                        { name: i18n.t('menu.back'), value: 'back' },
                        { name: i18n.t('menu.export_files'), value: 'import_from_list' },
                        { name: i18n.t('menu.delete_files'), value: 'delete_from_list' },
                        { name: i18n.t('menu.refresh'), value: 'refresh' }
                    ]
                }]);

                if (afterListAction === 'back') {
                    break; // 返回主菜单
                } else if (afterListAction === 'import_from_list') {
                    const toImport = await selectFilters(files, '导入');
                    if (toImport && toImport.length > 0) {
                        const { confirm } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'confirm',
                            message: i18n.t('file.delete_confirm', { count: toImport.length }),
                            default: true
                        }]);
                        if (confirm) {
                            await importFiles(toImport);
                        }
                    }
                } else if (afterListAction === 'delete_from_list') {
                    const toDelete = await selectFilters(files, '删除');
                    if (toDelete && toDelete.length > 0) {
                        const { confirm } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'confirm',
                            message: i18n.t('file.delete_confirm', { count: toDelete.length }),
                            default: false
                        }]);
                        if (confirm) {
                            await deleteFiles(toDelete);
                        }
                    }
                } else if (afterListAction === 'refresh') {
                    // 重新加载文件列表
                    console.log(chalk.cyan(`\n${i18n.t('settings.refreshing_list')}`));
                    files = getFileList();
                    if (files.length === 0) {
                        console.log(chalk.yellow(i18n.t('device.no_files')));
                    } else {
                        console.log(chalk.cyan(i18n.t('device.files_found', { count: files.length })));
                    }
                }
                break;

            case 'import':
                const toImport = await selectFilters(files, '导入');
                if (toImport && toImport.length > 0) {
                    const { confirm } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                            message: i18n.t('confirm.import_files', { count: toImport.length }),
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
                    console.log(chalk.red(`\n⚠️  ${i18n.t('file.cleanup_warning', { count: toDelete.length, size: sizeStr })}`));

                    const { confirm } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: i18n.t('confirm.delete_files'),
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
                // Reload file list after settings (path may have changed)
                console.log(chalk.cyan(`\n${i18n.t('settings.refreshing_list')}`));
                files = getFileList();
                if (files.length === 0) {
                    console.log(chalk.yellow(i18n.t('device.no_files')));
                } else {
                    console.log(chalk.cyan(i18n.t('device.files_found', { count: files.length })));
                }
                break;

            case 'refresh':
                return mainMenu();

            case 'exit':
                console.log(chalk.green(`\n${i18n.t('menu.goodbye')} 👋  -- ${author}\n`));
                process.exit(0);
        }
    }
}

// ========== 启动 ==========

// 初始化国际化
const configPath = getConfigPath();
i18n.init(configPath);

selectDeviceMenu().catch(err => {
    console.error(chalk.red(i18n.t('error.generic')), err.message);
    process.exit(1);
});
