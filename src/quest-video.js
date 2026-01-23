/**
 * Meta Quest 视频管理工具
 * 用于管理 Quest 设备上录制的视频
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table3');
const dayjs = require('dayjs');

// 配置
const CONFIG = {
    // Quest视频存储路径
    QUEST_VIDEO_PATH: '/sdcard/oculus/VideoShots',
    // 本地导入目录（当前目录）
    LOCAL_PATH: process.cwd(),
    // 日期格式
    DATE_FORMAT: 'YYYY-MM-DD HH:mm'
};

// 视频文件信息
class VideoFile {
    constructor(fullPath, size, date) {
        this.fullPath = fullPath;
        this.size = size;
        this.date = date;

        // 从路径中获取文件名
        const pathParts = fullPath.split('/');
        this.fileName = pathParts[pathParts.length - 1];

        // 从文件名提取应用名
        // 文件名格式: fun.ProtonGame.PPGoMPOC-20260107-101211-0.mp4
        // 提取前两段: fun.ProtonGame
        this.packageName = this._extractPackageName(this.fileName);
    }

    // 从文件名提取应用名（取前两段）
    _extractPackageName(fileName) {
        // 去掉扩展名
        const nameWithoutExt = fileName.replace(/\.mp4$/i, '');
        // 按点分割
        const parts = nameWithoutExt.split('.');
        if (parts.length >= 2) {
            // 取前两段作为应用名
            return `${parts[0]}.${parts[1]}`;
        }
        return parts[0] || 'unknown';
    }

    // 格式化大小显示
    get sizeFormatted() {
        const mb = this.size / (1024 * 1024);
        if (mb >= 1024) {
            return (mb / 1024).toFixed(2) + ' GB';
        }
        return mb.toFixed(1) + ' MB';
    }

    // 格式化日期显示
    get dateFormatted() {
        return dayjs(this.date).format(CONFIG.DATE_FORMAT);
    }

    // 用于显示的简短包名
    get shortPackageName() {
        return this.packageName;
    }
}

// 执行ADB命令
function adbExec(command, silent = false) {
    try {
        const result = execSync(`adb ${command}`, {
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
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

// 执行ADB shell命令（Windows兼容）
function adbShell(shellCommand, silent = false) {
    // Windows下需要特殊处理引号
    const cmd = `adb shell ${shellCommand}`;
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

// 检查ADB连接
function checkAdbConnection() {
    // 先检查 adb 是否可用
    try {
        execSync('adb version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
        console.log(chalk.red('\n❌ 找不到 ADB 命令，请确保：'));
        console.log(chalk.yellow('   1. 已安装 Android SDK Platform Tools'));
        console.log(chalk.yellow('   2. ADB 已添加到系统 PATH 环境变量'));
        console.log(chalk.yellow('   下载地址: https://developer.android.com/studio/releases/platform-tools'));
        return false;
    }

    const devices = adbExec('devices', true);
    if (!devices) {
        console.log(chalk.red('\n❌ ADB 命令执行失败'));
        return false;
    }

    // 解析设备列表
    const lines = devices.split('\n').slice(1); // 跳过 "List of devices attached"
    const connectedDevices = lines.filter(line => line.includes('\tdevice'));

    if (connectedDevices.length === 0) {
        console.log(chalk.red('\n❌ 未检测到 Quest 设备，请确保：'));
        console.log(chalk.yellow('   1. Quest 已通过 USB 连接到电脑'));
        console.log(chalk.yellow('   2. 已在 Quest 中允许 USB 调试'));
        console.log(chalk.yellow('   3. 如果是首次连接，请在 Quest 中点击"允许"'));
        return false;
    }

    console.log(chalk.green(`✓ 已连接设备: ${connectedDevices.length} 台`));
    return true;
}

// 获取设备上的视频列表
function getVideoList() {
    console.log(chalk.cyan('\n正在扫描设备视频...'));

    // 使用 ls -laR 递归列出所有文件（更兼容）
    const lsResult = adbShell(`ls -laR ${CONFIG.QUEST_VIDEO_PATH}`, true);

    if (!lsResult) {
        return [];
    }

    const videos = [];
    let currentDir = CONFIG.QUEST_VIDEO_PATH;

    // 解析 ls -laR 输出
    // 格式示例:
    // /sdcard/oculus/VideoShots/com.xxx:
    // total 123456
    // -rw-rw---- 1 root sdcard_rw 123456789 2024-01-07 12:34 video.mp4
    const lines = lsResult.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        // 检测目录行（以冒号结尾）
        if (trimmedLine.endsWith(':')) {
            currentDir = trimmedLine.slice(0, -1);
            continue;
        }

        // 跳过空行和total行
        if (!trimmedLine || trimmedLine.startsWith('total')) {
            continue;
        }

        // 解析文件行
        // -rw-rw---- 1 root sdcard_rw 123456789 2024-01-07 12:34 video.mp4
        const match = trimmedLine.match(/^[\-rwxd]+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/);

        if (match && match[4].toLowerCase().endsWith('.mp4')) {
            const size = parseInt(match[1]);
            const dateStr = `${match[2]} ${match[3]}`;
            const fileName = match[4];
            const fullPath = `${currentDir}/${fileName}`;
            const date = new Date(dateStr);

            videos.push(new VideoFile(fullPath, size, date));
        }
    }

    // 按日期降序排序
    videos.sort((a, b) => b.date - a.date);

    console.log(chalk.green(`找到 ${videos.length} 个视频文件`));

    return videos;
}

// 显示视频列表表格
function displayVideoTable(videos, title = '视频列表') {
    if (videos.length === 0) {
        console.log(chalk.yellow('\n没有找到视频文件'));
        return;
    }

    const table = new Table({
        head: [
            chalk.cyan('#'),
            chalk.cyan('日期'),
            chalk.cyan('应用'),
            chalk.cyan('文件名'),
            chalk.cyan('大小')
        ],
        colWidths: [5, 18, 25, 35, 12]
    });

    let totalSize = 0;
    videos.forEach((video, index) => {
        totalSize += video.size;
        table.push([
            index + 1,
            video.dateFormatted,
            video.shortPackageName,
            video.fileName.substring(0, 32),
            video.sizeFormatted
        ]);
    });

    console.log(chalk.green(`\n=== ${title} (共 ${videos.length} 个) ===`));
    console.log(table.toString());
    console.log(chalk.cyan(`总大小: ${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`));
}

// 获取所有包名
function getPackageNames(videos) {
    const packages = new Set();
    videos.forEach(v => packages.add(v.packageName));
    return Array.from(packages).sort();
}

// 获取所有日期
function getUniqueDates(videos) {
    const dates = new Set();
    videos.forEach(v => dates.add(dayjs(v.date).format('YYYY-MM-DD')));
    return Array.from(dates).sort().reverse();
}

// 按条件筛选视频
function filterVideos(videos, filters) {
    let result = [...videos];

    if (filters.packages && filters.packages.length > 0) {
        result = result.filter(v => filters.packages.includes(v.packageName));
    }

    if (filters.dates && filters.dates.length > 0) {
        result = result.filter(v => {
            const videoDate = dayjs(v.date).format('YYYY-MM-DD');
            return filters.dates.includes(videoDate);
        });
    }

    if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        result = result.filter(v => {
            const d = dayjs(v.date);
            return d.isAfter(start) && d.isBefore(end);
        });
    }

    return result;
}

// 导入视频到本地
async function importVideos(videos) {
    if (videos.length === 0) {
        console.log(chalk.yellow('没有要导入的视频'));
        return;
    }

    // 创建 Videos/今天日期 目录
    const todayStr = dayjs().format('YYYY-MM-DD');
    const localDir = path.join(CONFIG.LOCAL_PATH, 'Videos', todayStr);
    if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
    }

    console.log(chalk.cyan(`\n开始导入 ${videos.length} 个视频到: ${localDir}`));

    let success = 0;
    let failed = 0;

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        process.stdout.write(chalk.cyan(`[${i + 1}/${videos.length}] 导入 ${video.fileName}... `));

        const localPath = path.join(localDir, video.fileName);

        // Windows下adb pull命令处理
        try {
            const cmd = `adb pull "${video.fullPath}" "${localPath}"`;
            const result = execSync(cmd, {
                encoding: 'utf-8',
                maxBuffer: 50 * 1024 * 1024,
                windowsHide: true
            });

            if (fs.existsSync(localPath)) {
                const stats = fs.statSync(localPath);
                if (stats.size > 0) {
                    console.log(chalk.green('✓'));
                    success++;
                } else {
                    console.log(chalk.red('✗ (空文件)'));
                    failed++;
                }
            } else {
                console.log(chalk.red('✗ (文件未创建)'));
                failed++;
            }
        } catch (error) {
            // 显示详细错误
            const errMsg = error.stderr ? error.stderr.toString().trim() : error.message;
            console.log(chalk.red(`✗ (${errMsg.substring(0, 50)})`));
            failed++;
        }
    }

    console.log(chalk.green(`\n导入完成: ${success} 成功, ${failed} 失败`));
    console.log(chalk.cyan(`保存位置: ${localDir}`));
}

// 删除设备上的视频
async function deleteVideos(videos) {
    if (videos.length === 0) {
        console.log(chalk.yellow('没有要删除的视频'));
        return;
    }

    console.log(chalk.red(`\n开始删除 ${videos.length} 个视频...`));

    let success = 0;
    let failed = 0;

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        process.stdout.write(chalk.yellow(`[${i + 1}/${videos.length}] 删除 ${video.fileName}... `));

        // 使用 adbShell 删除文件
        adbShell(`rm "${video.fullPath}"`, true);

        // 验证是否删除成功（检查文件是否还存在）
        const checkResult = adbShell(`ls "${video.fullPath}" 2>/dev/null`, true);
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

// 日期快速选择
function getDateQuickChoices() {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const threeDaysAgo = dayjs().subtract(3, 'day').format('YYYY-MM-DD');
    const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

    return [
        { name: `今天 (${today})`, value: 'today', dates: [today] },
        { name: `昨天 (${yesterday})`, value: 'yesterday', dates: [yesterday] },
        { name: '最近3天', value: 'last3days', dateRange: { start: dayjs().subtract(3, 'day'), end: dayjs().add(1, 'day') } },
        { name: '最近7天', value: 'last7days', dateRange: { start: dayjs().subtract(7, 'day'), end: dayjs().add(1, 'day') } },
        { name: '选择具体日期...', value: 'custom' }
    ];
}

// 选择筛选条件
async function selectFilters(videos, action) {
    const packages = getPackageNames(videos);
    const dates = getUniqueDates(videos);

    // 计算总大小
    const totalSize = videos.reduce((sum, v) => sum + v.size, 0);
    const totalSizeStr = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

    // 先选择筛选方式
    const { filterType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'filterType',
            message: '选择筛选方式:',
            choices: [
                { name: `🚀 全部${action} (${videos.length}个, ${totalSizeStr}GB)`, value: 'all' },
                { name: '📅 按日期筛选', value: 'date' },
                { name: '📦 按应用筛选', value: 'package' },
                { name: '🎯 同时按日期和应用', value: 'both' },
                { name: '✅ 手动勾选', value: 'manual' },
                { name: '↩️  返回', value: 'back' }
            ]
        }
    ]);

    if (filterType === 'back') {
        return null;
    }

    // 全选直接返回所有视频（不需要再手动勾选）
    if (filterType === 'all') {
        return videos;
    }

    // 手动勾选模式，直接进入手动选择
    if (filterType === 'manual') {
        displayVideoTable(videos, '所有视频');

        const { selectedVideos } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedVideos',
                message: `选择要${action}的视频 (空格选择，A全选，回车确认):`,
                choices: videos.map((v, i) => ({
                    name: `[${v.dateFormatted}] ${v.shortPackageName} / ${v.fileName} (${v.sizeFormatted})`,
                    value: i,
                    short: v.fileName
                })),
                pageSize: 20
            }
        ]);

        return selectedVideos.map(i => videos[i]);
    }

    let filters = {};

    // 日期筛选
    if (filterType === 'date' || filterType === 'both') {
        const dateChoices = getDateQuickChoices();
        const { dateOption } = await inquirer.prompt([
            {
                type: 'list',
                name: 'dateOption',
                message: '选择日期范围:',
                choices: dateChoices
            }
        ]);

        const selected = dateChoices.find(c => c.value === dateOption);

        if (dateOption === 'custom') {
            // 显示所有可用日期供选择
            const { selectedDates } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedDates',
                    message: '选择日期 (空格选择，回车确认):',
                    choices: dates.map(d => ({
                        name: d,
                        value: d
                    })),
                    pageSize: 15
                }
            ]);
            filters.dates = selectedDates;
        } else if (selected.dates) {
            filters.dates = selected.dates;
        } else if (selected.dateRange) {
            filters.dateRange = selected.dateRange;
        }
    }

    // 应用筛选
    if (filterType === 'package' || filterType === 'both') {
        // 统计每个包的视频数量
        const packageCounts = {};
        videos.forEach(v => {
            packageCounts[v.packageName] = (packageCounts[v.packageName] || 0) + 1;
        });

        const { selectedPackages } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedPackages',
                message: '选择应用 (空格选择，回车确认):',
                choices: packages.map(p => ({
                    name: `${p} (${packageCounts[p]} 个视频)`,
                    value: p
                })),
                pageSize: 15
            }
        ]);
        filters.packages = selectedPackages;
    }

    // 应用筛选并显示结果
    let filteredVideos = filterVideos(videos, filters);

    if (filteredVideos.length === 0) {
        console.log(chalk.yellow('\n没有符合筛选条件的视频'));
        return [];
    }

    // 显示筛选结果并让用户确认选择
    displayVideoTable(filteredVideos, '筛选结果');

    const { selectedVideos } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selectedVideos',
            message: `选择要${action}的视频 (空格选择，A全选，回车确认):`,
            choices: filteredVideos.map((v, i) => ({
                name: `[${v.dateFormatted}] ${v.shortPackageName} / ${v.fileName} (${v.sizeFormatted})`,
                value: i,
                short: v.fileName
            })),
            pageSize: 20
        }
    ]);

    return selectedVideos.map(i => filteredVideos[i]);
}

// 清理设备（保留最近X天）
async function cleanupDevice(videos) {
    const { keepDays } = await inquirer.prompt([
        {
            type: 'list',
            name: 'keepDays',
            message: '保留最近几天的视频?',
            choices: [
                { name: '保留今天', value: 0 },
                { name: '保留最近3天', value: 3 },
                { name: '保留最近7天', value: 7 },
                { name: '保留最近14天', value: 14 },
                { name: '保留最近30天', value: 30 },
                { name: '全部删除', value: -1 },
                { name: '↩️  返回', value: 'back' }
            ]
        }
    ]);

    if (keepDays === 'back') {
        return;
    }

    let toDelete;
    if (keepDays === -1) {
        toDelete = videos;
    } else {
        const cutoffDate = dayjs().subtract(keepDays, 'day').startOf('day');
        toDelete = videos.filter(v => dayjs(v.date).isBefore(cutoffDate));
    }

    if (toDelete.length === 0) {
        console.log(chalk.yellow('\n没有符合条件的视频需要删除'));
        return;
    }

    displayVideoTable(toDelete, '将要删除的视频');

    const totalSize = toDelete.reduce((sum, v) => sum + v.size, 0);
    console.log(chalk.red(`\n⚠️  将删除 ${toDelete.length} 个视频，释放 ${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB 空间`));

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '确认删除?',
            default: false
        }
    ]);

    if (confirm) {
        await deleteVideos(toDelete);
    } else {
        console.log(chalk.yellow('已取消'));
    }
}

// 主菜单
async function mainMenu() {
    console.log(chalk.green('\n╔════════════════════════════════════════╗'));
    console.log(chalk.green('║       EasyADB 视频管理工具 v1.0        ║'));
    console.log(chalk.green('╚════════════════════════════════════════╝'));

    // 检查ADB连接
    if (!checkAdbConnection()) {
        const { retry } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'retry',
                message: '是否重试?',
                default: true
            }
        ]);
        if (retry) {
            return mainMenu();
        }
        return;
    }

    // 获取视频列表
    const videos = getVideoList();

    if (videos.length === 0) {
        console.log(chalk.yellow('\n设备上没有找到视频文件'));
        console.log(chalk.cyan(`检查路径: ${CONFIG.QUEST_VIDEO_PATH}`));
        return;
    }

    console.log(chalk.cyan(`\n发现 ${videos.length} 个视频文件`));

    while (true) {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '请选择操作:',
                choices: [
                    { name: '📋 查看视频列表', value: 'list' },
                    { name: '📥 导入视频到电脑', value: 'import' },
                    { name: '🗑️  删除设备视频', value: 'delete' },
                    { name: '🧹 清理设备（保留最近X天）', value: 'cleanup' },
                    { name: '🔄 刷新列表', value: 'refresh' },
                    { name: '❌ 退出', value: 'exit' }
                ],
                pageSize: 10
            }
        ]);

        switch (action) {
            case 'list':
                displayVideoTable(videos);
                break;

            case 'import':
                const toImport = await selectFilters(videos, '导入');
                if (toImport && toImport.length > 0) {
                    const { confirmImport } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmImport',
                            message: `确认导入 ${toImport.length} 个视频?`,
                            default: true
                        }
                    ]);
                    if (confirmImport) {
                        await importVideos(toImport);
                    }
                }
                break;

            case 'delete':
                const toDelete = await selectFilters(videos, '删除');
                if (toDelete && toDelete.length > 0) {
                    const totalSize = toDelete.reduce((sum, v) => sum + v.size, 0);
                    console.log(chalk.red(`\n⚠️  将删除 ${toDelete.length} 个视频，释放 ${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`));

                    const { confirmDelete } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmDelete',
                            message: '确认删除? (此操作不可恢复)',
                            default: false
                        }
                    ]);
                    if (confirmDelete) {
                        await deleteVideos(toDelete);
                        // 从列表中移除已删除的视频
                        toDelete.forEach(v => {
                            const index = videos.indexOf(v);
                            if (index > -1) videos.splice(index, 1);
                        });
                    }
                }
                break;

            case 'cleanup':
                await cleanupDevice(videos);
                break;

            case 'refresh':
                return mainMenu();

            case 'exit':
                console.log(chalk.green('\n再见! 👋\n'));
                process.exit(0);
        }
    }
}

// 启动
mainMenu().catch(err => {
    console.error(chalk.red('发生错误:'), err.message);
    process.exit(1);
});
