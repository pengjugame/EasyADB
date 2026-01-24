/**
 * 使用DeepL MCP翻译EasyADB的中文翻译文件
 */

const fs = require('fs');
const path = require('path');

// 读取中文翻译文件
const zhTranslations = JSON.parse(fs.readFileSync('src/lib/i18n/zh.json', 'utf8'));

console.log('开始使用DeepL翻译EasyADB翻译文件...');
console.log(`需要翻译 ${Object.keys(zhTranslations).length} 个顶级键`);

// 递归函数来处理嵌套对象
function processTranslations(obj, prefix = '') {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string') {
            // 这是一个需要翻译的字符串
            console.log(`翻译: ${fullKey} = "${value}"`);
            // 这里可以调用DeepL API
            result[key] = `[待翻译] ${value}`;
        } else if (typeof value === 'object') {
            // 这是一个嵌套对象
            result[key] = processTranslations(value, fullKey);
        } else {
            // 其他类型直接复制
            result[key] = value;
        }
    }

    return result;
}

// 处理翻译
const translated = processTranslations(zhTranslations);

console.log('\n翻译完成！');
console.log('注意: 这是一个示例脚本，实际需要调用DeepL MCP API来完成翻译');

// 保存结果（示例）
const outputPath = 'src/lib/i18n/en-translated.json';
fs.writeFileSync(outputPath, JSON.stringify(translated, null, 2), 'utf8');
console.log(`结果已保存到: ${outputPath}`);