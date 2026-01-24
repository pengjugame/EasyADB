/**
 * 国际化 (i18n) 模块
 * 支持多语言切换和翻译管理
 */

const fs = require('fs');
const path = require('path');

// 语言文件目录
const LANG_DIR = path.join(__dirname);

// 支持的语言列表
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'zh': '中文'
};

// 默认语言
const DEFAULT_LANGUAGE = 'zh';

// 当前语言
let currentLanguage = DEFAULT_LANGUAGE;

// 语言数据缓存
let translations = {};

// 配置文件路径
let globalConfigPath = null;

/**
 * 设置配置文件路径
 * @param {string} configPath - 配置文件路径
 */
function setConfigPath(configPath) {
  this.configPath = configPath;
}

/**
 * 加载语言文件
 * @param {string} lang - 语言代码
 * @returns {boolean} 是否加载成功
 */
function loadLanguage(lang) {
  try {
    const langFile = path.join(LANG_DIR, `${lang}.json`);

    if (!fs.existsSync(langFile)) {
      console.warn(`语言文件不存在: ${langFile}`);
      return false;
    }

    const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    translations = langData;
    currentLanguage = lang;

    return true;
  } catch (error) {
    console.error(`加载语言文件失败: ${lang}`, error);
    return false;
  }
}

/**
 * 保存用户语言设置
 * @param {string} lang - 语言代码
 */
function saveLanguageSetting(lang) {
  if (!globalConfigPath) {
    console.warn('配置文件路径未设置，无法保存语言设置');
    return;
  }

  try {
    let config = {};

    // 读取现有配置
    if (fs.existsSync(globalConfigPath)) {
      config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
    }

    // 更新语言设置
    config.language = lang;

    // 写入配置文件
    fs.writeFileSync(globalConfigPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('保存语言设置失败:', error);
  }
}

/**
 * 加载用户语言设置
 * @returns {string} 语言代码
 */
function loadLanguageSetting() {
  if (!globalConfigPath || !fs.existsSync(globalConfigPath)) {
    return DEFAULT_LANGUAGE;
  }

  try {
    const config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
    return config.language || DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('加载语言设置失败:', error);
    return DEFAULT_LANGUAGE;
  }
}

/**
 * 初始化i18n模块
 * @param {string} configPath - 配置文件路径
 */
function init(configPath) {
  globalConfigPath = configPath;

  // 加载用户保存的语言设置
  const savedLang = loadLanguageSetting();

  // 加载语言文件
  if (!loadLanguage(savedLang)) {
    // 如果保存的语言加载失败，使用默认语言
    loadLanguage(DEFAULT_LANGUAGE);
  }
}

/**
 * 翻译函数
 * @param {string} key - 翻译键，支持点号分隔的嵌套键，如 'menu.main_title'
 * @param {object} variables - 变量替换对象，如 {count: 5}
 * @returns {string} 翻译后的文本
 */
function t(key, variables = {}) {
  try {
    // 支持嵌套键，如 'menu.main_title'
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      value = value[k];
      if (value === undefined) {
        // 如果找不到翻译，返回键名并添加警告标记
        console.warn(`翻译键未找到: ${key}`);
        return `[${key}]`;
      }
    }

    // 如果值不是字符串，返回键名
    if (typeof value !== 'string') {
      console.warn(`翻译值不是字符串: ${key}`);
      return `[${key}]`;
    }

    // 变量替换
    let result = value;
    for (const [varKey, varValue] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${varKey}\\}`, 'g'), varValue);
    }

    return result;
  } catch (error) {
    console.error(`翻译错误: ${key}`, error);
    return `[${key}]`;
  }
}

/**
 * 获取当前语言
 * @returns {string} 当前语言代码
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * 获取支持的语言列表
 * @returns {object} 语言列表 {code: name}
 */
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

/**
 * 切换语言
 * @param {string} lang - 新的语言代码
 * @returns {boolean} 是否切换成功
 */
function switchLanguage(lang) {
  if (!SUPPORTED_LANGUAGES[lang]) {
    console.error(`不支持的语言: ${lang}`);
    return false;
  }

  if (loadLanguage(lang)) {
    saveLanguageSetting(lang);
    return true;
  }

  return false;
}

module.exports = {
  init,
  t,
  getCurrentLanguage,
  getSupportedLanguages,
  switchLanguage,
  setConfigPath
};