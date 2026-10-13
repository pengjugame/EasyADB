/**
 * EasyADB 无交互 CLI（给人/脚本/Agent 用，和 TUI 菜单入口分离）
 *
 * 旧参数保持可用：--preset --date --days --source --query --last --name --out --yes。
 * 重复传入的 --date / --query / --name / --source / --ext 是「或」。
 * 删除和 cleanup 不带 --yes 只预览，不会改设备。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const dayjs = require('dayjs');

const REPEATABLE = new Set(['date', 'query', 'name', 'source', 'ext']);
const VALUE_FLAGS = new Set([
    'preset', 'date', 'days', 'source', 'query', 'last', 'oldest', 'name', 'out',
    'from', 'to', 'ext', 'min-size', 'max-size', 'regex', 'sort', 'order', 'serial',
    'keep', 'apk', 'older-than'
]);
const BOOL_FLAGS = new Set([
    'yes', 'flat', 'skip-existing', 'no-overwrite', 'then-delete', 'by-date',
    'all-presets', 'dry-run'
]);

function parseArgv(argv) {
    const cmd = argv[0];
    const flags = {};
    const positionals = [];
    const unknown = [];

    for (let i = 1; i < argv.length; i++) {
        const raw = argv[i];
        if (!raw.startsWith('--')) {
            positionals.push(raw);
            continue;
        }

        const body = raw.slice(2);
        const eq = body.indexOf('=');
        let key;
        let value;
        if (eq >= 0) {
            key = body.slice(0, eq);
            value = body.slice(eq + 1);
        } else {
            key = body;
            const next = argv[i + 1];
            if (VALUE_FLAGS.has(key)) {
                if (!next || next.startsWith('--')) {
                    throw new Error(`--${key} 需要参数`);
                }
                value = next;
                i++;
            } else if (BOOL_FLAGS.has(key)) {
                value = true;
            } else {
                unknown.push(key);
                continue;
            }
        }

        if (!VALUE_FLAGS.has(key) && !BOOL_FLAGS.has(key)) {
            unknown.push(key);
            continue;
        }

        if (REPEATABLE.has(key)) {
            flags[key] = flags[key] || [];
            flags[key].push(value);
        } else if (Object.prototype.hasOwnProperty.call(flags, key)) {
            throw new Error(`--${key} 只能出现一次`);
        } else {
            flags[key] = value;
        }
    }

    if (unknown.length > 0) {
        throw new Error(`未知参数: ${unknown.map(name => '--' + name).join(', ')}`);
    }
    flags._positionals = positionals;
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

function requireInt(value, flag, min) {
    if (value === true || value === undefined) {
        throw new Error(`${flag} 需要整数`);
    }
    if (!/^-?\d+$/.test(String(value))) {
        throw new Error(`${flag} 必须是 >= ${min} 的整数，收到: ${value}`);
    }
    const n = Number(value);
    if (n < min) {
        throw new Error(`${flag} 必须是 >= ${min} 的整数，收到: ${value}`);
    }
    return n;
}

function parseSize(input, flag) {
    const match = String(input).trim().match(/^(\d+(?:\.\d+)?)([kmg]b?)?$/i);
    if (!match) {
        throw new Error(`${flag} 无效: ${input}（例: 500, 10M, 1.5G）`);
    }
    const n = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    const mul = unit.startsWith('g') ? 1024 ** 3 : unit.startsWith('m') ? 1024 ** 2 : unit.startsWith('k') ? 1024 : 1;
    return Math.round(n * mul);
}

function resolveDay(token) {
    const text = String(token).trim();
    const lower = text.toLowerCase();
    if (lower === 'today') return dayjs().format('YYYY-MM-DD');
    if (lower === 'yesterday') return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const parsed = dayjs(text);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !parsed.isValid() || parsed.format('YYYY-MM-DD') !== text) {
        throw new Error(`日期无效: ${token}（用 today、yesterday 或 YYYY-MM-DD）`);
    }
    return text;
}

function asList(value) {
    if (value === undefined || value === true) return [];
    return Array.isArray(value) ? value : [value];
}

function buildQuery(flags) {
    const dates = asList(flags.date).map(resolveDay);
    const hasDays = flags.days !== undefined;
    const hasRange = flags.from !== undefined || flags.to !== undefined;
    const hasOlder = flags['older-than'] !== undefined;
    const rangeKinds = [dates.length > 0, hasDays, hasRange, hasOlder].filter(Boolean).length;
    if (rangeKinds > 1) {
        throw new Error('日期条件只能用一组：--date、--days、--from/--to、--older-than');
    }

    const query = {
        dates,
        sources: asList(flags.source),
        queries: asList(flags.query).map(item => String(item).toLowerCase()),
        names: asList(flags.name),
        exts: asList(flags.ext).map(item => {
            const text = String(item).toLowerCase();
            return text.startsWith('.') ? text : `.${text}`;
        }),
        regex: null,
        minSize: flags['min-size'] !== undefined ? parseSize(flags['min-size'], '--min-size') : null,
        maxSize: flags['max-size'] !== undefined ? parseSize(flags['max-size'], '--max-size') : null,
        last: flags.last !== undefined ? requireInt(flags.last, '--last', 1) : null,
        oldest: flags.oldest !== undefined ? requireInt(flags.oldest, '--oldest', 1) : null,
        sort: flags.sort ? String(flags.sort) : 'date',
        order: flags.order ? String(flags.order) : null,
        olderThan: null,
        from: null,
        to: null,
        days: null
    };

    if (query.last !== null && query.oldest !== null) {
        throw new Error('--last 和 --oldest 只能用一个');
    }
    if (!['date', 'name', 'size'].includes(query.sort)) {
        throw new Error('--sort 只能是 date、name、size');
    }
    if (query.order && !['asc', 'desc'].includes(query.order)) {
        throw new Error('--order 只能是 asc 或 desc');
    }
    if (flags.regex) {
        try {
            query.regex = new RegExp(String(flags.regex), 'i');
        } catch (error) {
            throw new Error(`--regex 无效: ${error.message}`);
        }
    }

    if (hasDays) {
        query.days = requireInt(flags.days, '--days', 0);
        query.rangeStart = dayjs().subtract(query.days, 'day').startOf('day');
        query.rangeEnd = dayjs().endOf('day');
    }
    if (hasRange) {
        query.from = flags.from ? resolveDay(flags.from) : null;
        query.to = flags.to ? resolveDay(flags.to) : null;
        query.rangeStart = query.from ? dayjs(query.from).startOf('day') : dayjs('1970-01-01');
        query.rangeEnd = query.to ? dayjs(query.to).endOf('day') : dayjs().add(100, 'year');
        if (query.rangeStart.isAfter(query.rangeEnd)) {
            throw new Error('--from 不能晚于 --to');
        }
    }
    if (hasOlder) {
        query.olderThan = requireInt(flags['older-than'], '--older-than', 0);
    }
    return query;
}

function isNarrowed(query) {
    return query.dates.length > 0
        || query.days !== null
        || query.from !== null
        || query.to !== null
        || query.olderThan !== null
        || query.sources.length > 0
        || query.queries.length > 0
        || query.names.length > 0
        || query.exts.length > 0
        || query.regex !== null
        || query.minSize !== null
        || query.maxSize !== null
        || query.last !== null
        || query.oldest !== null;
}

function selectFiles(files, flags) {
    const query = buildQuery(flags);
    let result = files.filter(file => {
        const day = dayjs(file.date).format('YYYY-MM-DD');
        if (query.dates.length > 0 && !query.dates.includes(day)) return false;
        if (query.rangeStart && (dayjs(file.date).isBefore(query.rangeStart) || dayjs(file.date).isAfter(query.rangeEnd))) {
            return false;
        }
        if (query.olderThan !== null) {
            const cutoff = dayjs().subtract(query.olderThan, 'day').startOf('day');
            if (!dayjs(file.date).isBefore(cutoff)) return false;
        }
        if (query.sources.length > 0 && !query.sources.includes(file.sourceName)) return false;
        if (query.exts.length > 0 && !query.exts.some(ext => file.fileName.toLowerCase().endsWith(ext))) return false;
        if (query.names.length > 0 && !query.names.includes(file.fileName)) return false;
        if (query.queries.length > 0) {
            const hay = `${file.fileName}\n${file.sourceName}\n${file.fullPath}`.toLowerCase();
            if (!query.queries.some(item => hay.includes(item))) return false;
        }
        if (query.regex && !query.regex.test(file.fileName) && !query.regex.test(String(file.sourceName)) && !query.regex.test(file.fullPath)) {
            return false;
        }
        if (query.minSize !== null && file.size < query.minSize) return false;
        if (query.maxSize !== null && file.size > query.maxSize) return false;
        return true;
    });

    const byNewest = [...result].sort((a, b) => b.date - a.date);
    if (query.last !== null) result = byNewest.slice(0, query.last);
    else if (query.oldest !== null) result = byNewest.slice(-query.oldest);
    else result = byNewest;

    const order = query.order || (query.sort === 'name' ? 'asc' : 'desc');
    const dir = order === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
        if (query.sort === 'name') return dir * a.fileName.localeCompare(b.fileName);
        if (query.sort === 'size') return dir * (a.size - b.size);
        return dir * (a.date - b.date);
    });

    return { files: result, narrowed: isNarrowed(query) };
}

function publicFile(row) {
    const copy = { ...row };
    delete copy.file;
    return copy;
}

function helpText() {
    return `EasyADB CLI（无交互）

用法:
  node adb-manager.js <command> [options]

命令:
  devices              已连接 / 未授权 / 离线设备
  presets              预设列表（不访问设备）
  list | find          列出文件，find 与 list 相同
  stats | query        统计；含剩余空间和本机是否已有
  export               导出到本地
  delete               删除设备文件。不带 --yes 只预览
  cleanup              按保留天数清理。不带 --yes 只预览
  install              安装 APK：install <文件.apk>
  help                 本说明

查找（可叠加，日期条件只能选一组）:
  --preset videos|screenshots|dcim|download   默认 videos
  --all-presets        只用于 list/find/stats，四个预设都扫
  --date today|yesterday|YYYY-MM-DD           可重复，表示这些天
  --days N             最近 N 天，含今天。0 = 今天
  --from YYYY-MM-DD --to YYYY-MM-DD           闭区间，可只给一端
  --older-than N       早于今天往前 N 天的 0 点
  --query TEXT         文件名 / 来源 / 路径子串，可重复（或）
  --regex PATTERN      同上，正则无效就直接报错
  --name FILE.mp4      精确文件名，可重复
  --source NAME        精确来源，可重复
  --ext mp4            额外后缀，可重复
  --min-size 10M       字节，或 K / M / G
  --max-size 2G
  --last N             最新的 N 个（按时间，不受 --sort 影响）
  --oldest N           最旧的 N 个
  --sort date|name|size
  --order asc|desc
  --serial SERIAL      多设备时指定序列号

导出:
  --out DIR            绝对或相对路径。C / D / E 都可以
  --flat               默认目录不再套当天日期
  --by-date            --out 下面再套当天日期
  --skip-existing      本地已有且大小一致则跳过
  --no-overwrite       本地已有同名文件就跳过
  --dry-run            只列出将要导出的文件
  --then-delete        导出且大小核对通过后删设备文件，必须同时 --yes
  省略 --out 时落到 ~/Downloads/EasyADB/当天日期

删除:
  --yes                真正删除。没有它就是预览
  --dry-run            同预览
  cleanup --keep N     保留最近 N 天（0 = 只留今天）
  cleanup --keep all   该预设下全部文件，必须 --yes 才会删

示例:
  node adb-manager.js find --query PPGo --days 7 --min-size 1M
  node adb-manager.js list --date today --last 1
  node adb-manager.js export --date today --last 1 --out D:\\\\Videos
  node adb-manager.js delete --name "a.mp4"
  node adb-manager.js delete --name "a.mp4" --yes
  node adb-manager.js cleanup --keep 7 --yes
`;
}

function parseDeviceLines(raw) {
    if (!raw) {
        return { ok: false, error: 'adb devices 失败', devices: [] };
    }
    const devices = [];
    for (const line of raw.split('\n').slice(1)) {
        const text = line.trim();
        if (!text) continue;
        const parts = text.split(/\s+/);
        const extra = {};
        for (const part of parts.slice(2)) {
            const idx = part.indexOf(':');
            if (idx > 0) extra[part.slice(0, idx)] = part.slice(idx + 1);
        }
        devices.push({
            serial: parts[0],
            state: parts[1] || 'unknown',
            model: extra.model || null,
            product: extra.product || null
        });
    }
    return { ok: true, devices };
}

function ensureReady(ctx, flags) {
    if (flags.serial) ctx.setAdbSerial(flags.serial);
    const listed = parseDeviceLines(ctx.adbExec('devices -l', true));
    if (!listed.ok) throw new Error(listed.error);
    const connected = listed.devices.filter(item => item.state === 'device');
    if (flags.serial) {
        const hit = connected.find(item => item.serial === flags.serial);
        if (!hit) {
            const known = listed.devices.map(item => `${item.serial}(${item.state})`).join(', ') || '无';
            throw new Error(`找不到已授权设备 ${flags.serial}。当前: ${known}`);
        }
    } else if (connected.length === 0) {
        const known = listed.devices.map(item => `${item.serial}(${item.state})`).join(', ');
        throw new Error(known
            ? `没有已授权的 Android 设备。当前: ${known}`
            : '没有已授权的 Android 设备。请打开 USB 调试并授权本机。');
    } else if (connected.length > 1) {
        const known = connected.map(item => item.serial).join(', ');
        throw new Error(`连着多台设备，请加 --serial。当前: ${known}`);
    }
    return listed.devices;
}

function scanFiles(ctx, flags, command) {
    if (flags['all-presets']) {
        if (command !== 'list' && command !== 'find' && command !== 'stats' && command !== 'query') {
            throw new Error('--all-presets 只能用于 list、find、stats');
        }
        const all = [];
        for (const preset of ctx.listPresets()) {
            ctx.applyPresetByName(preset.key);
            const batch = ctx.getFileList({ silent: true, failIfUnreadable: true });
            for (const file of batch) file.presetKey = preset.key;
            all.push(...batch);
        }
        all.sort((a, b) => b.date - a.date);
        return { files: all, preset: 'all', remotePath: null, name: 'all presets' };
    }

    const presetKey = ctx.applyPresetByName(flags.preset);
    const files = ctx.getFileList({ silent: true, failIfUnreadable: true });
    for (const file of files) file.presetKey = presetKey;
    return {
        files,
        preset: presetKey,
        remotePath: ctx.CONFIG.device.remotePath,
        name: ctx.CONFIG.device.name
    };
}

function toPojo(ctx, file) {
    return {
        ...ctx.fileToPojo(file),
        preset: file.presetKey || null
    };
}

function resolveExportDir(flags) {
    const base = flags.out
        ? path.resolve(String(flags.out))
        : path.join(os.homedir(), 'Downloads', 'EasyADB');
    if (flags.out) {
        if (flags['by-date']) return path.join(base, dayjs().format('YYYY-MM-DD'));
        return base;
    }
    if (flags.flat) return base;
    return path.join(base, dayjs().format('YYYY-MM-DD'));
}

function localSearchRoots(exportDir) {
    const roots = [];
    const parent = path.dirname(exportDir);
    for (const dir of [exportDir, parent]) {
        if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
        roots.push(dir);
        for (const name of fs.readdirSync(dir)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue;
            const child = path.join(dir, name);
            if (fs.statSync(child).isDirectory()) roots.push(child);
        }
    }
    return [...new Set(roots)];
}

function annotateLocal(pojos, exportDir) {
    const roots = localSearchRoots(exportDir);
    return pojos.map(item => {
        let found = null;
        let foundSize = null;
        for (const dir of roots) {
            const candidate = path.join(dir, item.fileName);
            if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
            const size = fs.statSync(candidate).size;
            if (size === item.size) {
                found = candidate;
                foundSize = size;
                break;
            }
            if (!found) {
                found = candidate;
                foundSize = size;
            }
        }
        if (!found) {
            return { ...item, localStatus: 'missing', localPath: null, localSize: null };
        }
        return {
            ...item,
            localPath: found,
            localSize: foundSize,
            localStatus: foundSize === item.size ? 'same' : 'different'
        };
    });
}

function localSummary(files) {
    const summary = { same: 0, different: 0, missing: 0 };
    for (const file of files) {
        if (summary[file.localStatus] !== undefined) summary[file.localStatus] += 1;
    }
    return summary;
}

function buildStats(files, meta) {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const byDateMap = {};
    const bySourceMap = {};
    for (const file of files) {
        const day = dayjs(file.date).format('YYYY-MM-DD');
        byDateMap[day] = byDateMap[day] || { date: day, count: 0, size: 0 };
        byDateMap[day].count += 1;
        byDateMap[day].size += file.size;
        const src = file.sourceName || 'unknown';
        bySourceMap[src] = bySourceMap[src] || { source: src, count: 0, size: 0 };
        bySourceMap[src].count += 1;
        bySourceMap[src].size += file.size;
    }
    const days = Object.keys(byDateMap).sort();
    const newest = files.length ? [...files].sort((a, b) => b.date - a.date)[0] : null;
    const oldest = files.length ? [...files].sort((a, b) => a.date - b.date)[0] : null;
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
        newest: newest ? meta.toPojo(newest) : null,
        oldest: oldest ? meta.toPojo(oldest) : null,
        byDate: Object.keys(byDateMap).sort().reverse().map(key => ({
            ...byDateMap[key],
            sizeFormatted: formatSize(byDateMap[key].size)
        })),
        bySource: Object.values(bySourceMap).sort((a, b) => b.count - a.count).map(item => ({
            ...item,
            sizeFormatted: formatSize(item.size)
        }))
    };
}

function keepSet(scanned, flags) {
    if (flags.keep === undefined) throw new Error('cleanup 需要 --keep N 或 --keep all');
    if (String(flags.keep).toLowerCase() === 'all') {
        return { files: scanned, keep: 'all' };
    }
    const keep = requireInt(flags.keep, '--keep', 0);
    const cutoff = dayjs().subtract(keep, 'day').startOf('day');
    return {
        keep,
        cutoff: cutoff.format('YYYY-MM-DD HH:mm:ss'),
        files: scanned.filter(file => dayjs(file.date).isBefore(cutoff))
    };
}

async function removeFiles(ctx, files) {
    const deleted = await ctx.deleteFiles(files, { silent: true });
    const deletedPaths = new Set(deleted.map(file => file.fullPath));
    const failedFiles = files.filter(file => !deletedPaths.has(file.fullPath)).map(file => ctx.fileToPojo(file));
    return { deleted, failedFiles };
}

async function runCli(argv, ctx) {
    const { cmd, flags } = parseArgv(argv);

    const known = new Set(['help', '-h', '--help', 'devices', 'presets', 'list', 'find', 'stats', 'query', 'export', 'delete', 'cleanup', 'install']);
    if (cmd && !known.has(cmd)) {
        throw new Error(`未知命令: ${cmd}`);
    }

    if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
        process.stdout.write(helpText());
        return;
    }

    if (cmd === 'presets') {
        printJson({ ok: true, presets: ctx.listPresets() });
        return;
    }

    if (cmd === 'devices') {
        if (flags.serial) ctx.setAdbSerial(flags.serial);
        printJson(parseDeviceLines(ctx.adbExec('devices -l', true)));
        return;
    }

    if (cmd === 'install') {
        const apk = flags.apk || flags._positionals[0];
        if (!apk) throw new Error('install 需要 APK 路径');
        const cleanPath = String(apk).trim().replace(/^["']|["']$/g, '');
        if (!cleanPath.toLowerCase().endsWith('.apk')) throw new Error('不是 apk 文件');
        if (!fs.existsSync(cleanPath)) throw new Error(`找不到文件: ${cleanPath}`);
        ensureReady(ctx, flags);
        const result = await ctx.doInstallApk(cleanPath, { silent: true });
        printJson({ ok: result.ok, apk: cleanPath, error: result.error || null });
        if (!result.ok) process.exitCode = 1;
        return;
    }

    const devices = ensureReady(ctx, flags);
    const scanned = scanFiles(ctx, flags, cmd);
    let selected;
    if (cmd === 'cleanup') {
        const kept = keepSet(scanned.files, flags);
        const extra = selectFiles(kept.files, flags);
        selected = { files: extra.files, narrowed: true, keep: kept.keep, cutoff: kept.cutoff || null };
    } else {
        selected = selectFiles(scanned.files, flags);
    }

    const exportDir = resolveExportDir(flags);
    const pojos = annotateLocal(selected.files.map(file => toPojo(ctx, file)), exportDir);
    const meta = {
        preset: scanned.preset,
        remotePath: scanned.remotePath,
        name: scanned.name,
        toPojo: file => annotateLocal([toPojo(ctx, file)], exportDir)[0]
    };

    if (cmd === 'stats' || cmd === 'query') {
        const storage = scanned.remotePath ? ctx.readStorage(scanned.remotePath) : null;
        printJson({
            ...buildStats(selected.files, meta),
            scanned: scanned.files.length,
            devices,
            storage,
            localDir: exportDir,
            local: localSummary(pojos)
        });
        return;
    }

    if (cmd === 'list' || cmd === 'find') {
        printJson({
            ok: true,
            preset: scanned.preset,
            remotePath: scanned.remotePath,
            scanned: scanned.files.length,
            count: pojos.length,
            localDir: exportDir,
            local: localSummary(pojos),
            devices,
            files: pojos
        });
        return;
    }

    if (cmd === 'export') {
        if (flags['then-delete'] && !flags.yes) {
            throw new Error('--then-delete 必须同时带 --yes');
        }
        if (flags['dry-run']) {
            printJson({
                ok: true,
                dryRun: true,
                preset: scanned.preset,
                count: pojos.length,
                localDir: exportDir,
                thenDelete: Boolean(flags['then-delete']),
                files: pojos
            });
            return;
        }
        if (selected.files.length === 0) {
            printJson({
                ok: true,
                preset: scanned.preset,
                count: 0,
                success: 0,
                failed: 0,
                skipped: 0,
                localDir: exportDir,
                files: []
            });
            return;
        }
        const result = await ctx.importFiles(selected.files, {
            silent: true,
            outDir: exportDir,
            skipExisting: Boolean(flags['skip-existing']),
            noOverwrite: Boolean(flags['no-overwrite'])
        });
        let removed = null;
        if (flags['then-delete']) {
            const verified = result.files.filter(row =>
                row.file && row.localSize > 0 && row.localSize === row.size && (row.status === 'pulled' || row.status === 'skipped')
            );
            const outcome = await removeFiles(ctx, verified.map(row => row.file));
            removed = {
                requested: verified.length,
                success: outcome.deleted.length,
                failed: outcome.failedFiles.length,
                files: outcome.deleted.map(file => ctx.fileToPojo(file)),
                failedFiles: outcome.failedFiles
            };
        }
        printJson({
            ok: result.failed === 0 && (!removed || removed.failed === 0),
            preset: scanned.preset,
            count: selected.files.length,
            success: result.success,
            failed: result.failed,
            skipped: result.skipped,
            localDir: result.localDir,
            deleted: removed,
            files: (result.files || []).map(publicFile)
        });
        if (result.failed > 0 || (removed && removed.failed > 0)) process.exitCode = 1;
        return;
    }

    if (cmd === 'delete' || cmd === 'cleanup') {
        if (cmd === 'delete' && !selected.narrowed) {
            throw new Error('删除必须带过滤条件（--name / --query / --date / --days / --from / --to / --last / --source / --ext / --min-size / --regex 等）');
        }
        const preview = !flags.yes || Boolean(flags['dry-run']);
        if (preview) {
            printJson({
                ok: true,
                dryRun: true,
                deleted: false,
                command: cmd,
                preset: scanned.preset,
                keep: selected.keep !== undefined ? selected.keep : null,
                cutoff: selected.cutoff || null,
                count: pojos.length,
                files: pojos
            });
            return;
        }
        if (selected.files.length === 0) {
            printJson({ ok: false, error: '没有匹配的文件', count: 0, files: [] });
            process.exitCode = 1;
            return;
        }
        const outcome = await removeFiles(ctx, selected.files);
        printJson({
            ok: outcome.failedFiles.length === 0,
            dryRun: false,
            command: cmd,
            preset: scanned.preset,
            keep: selected.keep !== undefined ? selected.keep : null,
            requested: selected.files.length,
            success: outcome.deleted.length,
            failed: outcome.failedFiles.length,
            files: outcome.deleted.map(file => ctx.fileToPojo(file)),
            failedFiles: outcome.failedFiles
        });
        if (outcome.failedFiles.length > 0) process.exitCode = 1;
        return;
    }

    throw new Error(`未知命令: ${cmd}`);
}

module.exports = { runCli, parseArgv, selectFiles, resolveExportDir, parseSize, resolveDay };
