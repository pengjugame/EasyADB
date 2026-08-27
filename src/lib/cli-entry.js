/**
 * EasyADB 无交互 CLI（给人/脚本/Agent 用，和 TUI 菜单入口分离）
 */

const dayjs = require('dayjs');

function parseArgv(argv) {
    const cmd = argv[0];
    const flags = {};
    for (let i = 1; i < argv.length; i++) {
        const raw = argv[i];
        if (!raw.startsWith('--')) continue;
        const key = raw.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            flags[key] = true;
        } else {
            flags[key] = next;
            i++;
        }
    }
    return { cmd, flags };
}

function printJson(obj) {
    process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}

function buildFilters(flags) {
    const filters = {};
    if (flags.date) {
        const d = String(flags.date).toLowerCase();
        if (d === 'today') {
            filters.dates = [dayjs().format('YYYY-MM-DD')];
        } else if (d === 'yesterday') {
            filters.dates = [dayjs().subtract(1, 'day').format('YYYY-MM-DD')];
        } else {
            filters.dates = [flags.date];
        }
    }
    if (flags.days !== undefined && flags.days !== true) {
        const n = parseInt(flags.days, 10);
        if (Number.isNaN(n) || n < 0) {
            throw new Error(`--days 必须是 >= 0 的整数，收到: ${flags.days}`);
        }
        filters.dateRange = {
            start: dayjs().subtract(n, 'day').startOf('day').subtract(1, 'millisecond'),
            end: dayjs().add(1, 'day')
        };
    }
    if (flags.source) {
        filters.sources = [flags.source];
    }
    return filters;
}

function applyExtra(files, flags) {
    let result = files;
    if (flags.query) {
        const q = String(flags.query).toLowerCase();
        result = result.filter(f =>
            f.fileName.toLowerCase().includes(q) ||
            String(f.sourceName).toLowerCase().includes(q)
        );
    }
    if (flags.name) {
        const exact = String(flags.name);
        result = result.filter(f => f.fileName === exact);
    }
    if (flags.last !== undefined && flags.last !== true) {
        const n = parseInt(flags.last, 10);
        if (Number.isNaN(n) || n < 1) {
            throw new Error(`--last 必须是 >= 1 的整数，收到: ${flags.last}`);
        }
        result = result.slice(0, n);
    }
    return result;
}

function buildStats(files, meta) {
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    const byDateMap = {};
    const bySourceMap = {};
    for (const f of files) {
        const day = dayjs(f.date).format('YYYY-MM-DD');
        byDateMap[day] = byDateMap[day] || { date: day, count: 0, size: 0 };
        byDateMap[day].count += 1;
        byDateMap[day].size += f.size;
        const src = f.sourceName || 'unknown';
        bySourceMap[src] = bySourceMap[src] || { source: src, count: 0, size: 0 };
        bySourceMap[src].count += 1;
        bySourceMap[src].size += f.size;
    }
    const days = Object.keys(byDateMap).sort();
    const oldest = files.length ? files[files.length - 1] : null;
    const newest = files.length ? files[0] : null;
    let spanDays = 0;
    if (days.length) {
        spanDays = dayjs(days[days.length - 1]).diff(dayjs(days[0]), 'day') + 1;
    }
    return {
        ok: true,
        preset: meta.preset,
        remotePath: meta.remotePath,
        name: meta.name,
        count: files.length,
        totalSize,
        totalSizeFormatted: formatSize(totalSize),
        spanDays,
        dateFrom: days[0] || null,
        dateTo: days[days.length - 1] || null,
        newest: newest ? meta.fileToPojo(newest) : null,
        oldest: oldest ? meta.fileToPojo(oldest) : null,
        byDate: Object.keys(byDateMap).sort().reverse().map(k => ({
            ...byDateMap[k],
            sizeFormatted: formatSize(byDateMap[k].size)
        })),
        bySource: Object.values(bySourceMap).sort((a, b) => b.count - a.count).map(x => ({
            ...x,
            sizeFormatted: formatSize(x.size)
        }))
    };
}

function helpText() {
    return `EasyADB CLI（无交互）

用法:
  node adb-manager.js <command> [options]

命令:
  devices              已连接设备
  list                 列出文件
  stats | query        统计（总数、跨度天数、按日/来源）
  export               导出到本地
  delete               删除设备文件（必须 --yes，且必须带过滤条件）
  help                 本说明

选项:
  --preset videos|screenshots|dcim|download   默认 videos
  --date today|yesterday|YYYY-MM-DD
  --days N             最近 N 天（含今天）
  --source NAME        文件名解析出来的来源
  --query TEXT         文件名/来源子串
  --last N             按时间倒序取 N 个
  --name FILE.mp4      精确文件名
  --yes                delete 确认
  --out DIR            export 输出目录

示例:
  node adb-manager.js stats --preset videos
  node adb-manager.js list --date today --last 1
  node adb-manager.js export --date today --last 1 --out E:\\\\Temp\\\\quest
`;
}

function ensureConnected(ctx) {
    const devices = ctx.adbExec('devices', true);
    if (!devices) {
        throw new Error('adb devices 失败');
    }
    const connected = devices.split('\n').slice(1).filter(line => line.includes('\tdevice'));
    if (connected.length === 0) {
        throw new Error('没有已授权的 Android 设备。请打开 USB 调试并授权本机。');
    }
    return connected.map(line => line.split('\t')[0]);
}

async function runCli(argv, ctx) {
    const { cmd, flags } = parseArgv(argv);

    if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
        process.stdout.write(helpText());
        return;
    }

    if (cmd === 'devices') {
        const serials = ensureConnected(ctx);
        printJson({ ok: true, devices: serials });
        return;
    }

    const presetKey = ctx.applyPresetByName(flags.preset);
    const serials = ensureConnected(ctx);
    const files = ctx.getFileList({ silent: true });
    const filtered = applyExtra(ctx.filterFiles(files, buildFilters(flags)), flags);
    const meta = {
        preset: presetKey,
        remotePath: ctx.CONFIG.device.remotePath,
        name: ctx.CONFIG.device.name,
        fileToPojo: ctx.fileToPojo
    };

    if (cmd === 'stats' || cmd === 'query') {
        printJson({
            ...buildStats(filtered, meta),
            devices: serials
        });
        return;
    }

    if (cmd === 'list') {
        printJson({
            ok: true,
            preset: presetKey,
            remotePath: ctx.CONFIG.device.remotePath,
            count: filtered.length,
            files: filtered.map(ctx.fileToPojo)
        });
        return;
    }

    if (cmd === 'export') {
        const result = await ctx.importFiles(filtered, {
            silent: true,
            outDir: flags.out || undefined
        });
        printJson({
            ok: result.failed === 0,
            preset: presetKey,
            count: filtered.length,
            success: result.success,
            failed: result.failed,
            localDir: result.localDir,
            files: result.pulled
        });
        if (result.failed > 0) process.exitCode = 1;
        return;
    }

    if (cmd === 'delete') {
        if (!flags.yes) {
            throw new Error('删除需要 --yes');
        }
        const hasFilter = flags.query || flags.name || flags.date || flags.days !== undefined || flags.last || flags.source;
        if (!hasFilter) {
            throw new Error('删除必须带过滤条件（--name / --query / --date / --days / --last / --source）');
        }
        if (filtered.length === 0) {
            printJson({ ok: false, error: '没有匹配的文件', count: 0, files: [] });
            process.exitCode = 1;
            return;
        }
        const deleted = await ctx.deleteFiles(filtered, { silent: true });
        const deletedNames = new Set(deleted.map(f => f.fullPath));
        const failedFiles = filtered.filter(f => !deletedNames.has(f.fullPath)).map(ctx.fileToPojo);
        printJson({
            ok: failedFiles.length === 0,
            preset: presetKey,
            requested: filtered.length,
            success: deleted.length,
            failed: failedFiles.length,
            files: deleted.map(ctx.fileToPojo),
            failedFiles
        });
        if (failedFiles.length > 0) process.exitCode = 1;
        return;
    }

    throw new Error(`未知命令: ${cmd}`);
}

module.exports = { runCli };
