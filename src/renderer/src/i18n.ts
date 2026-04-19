import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "search": "Search",
      "searchPlaceholder": "Search by movie name or tags (e.g. Inception, Sci-Fi)",
      "settings": "Settings",
      "languageSettings": "Language Settings",
      "sitesManagement": "Sites Management",
      "mySites": "My Sites",
      "discoverSites": "Discover Sites",
      "autoFetch": "Auto-fetch Sites",
      "fetchLoading": "Scanning network for sites...",
      "copy": "Copy",
      "copied": "Copied!",
      "open": "Open",
      "add": "Add",
      "added": "Added",
      "status": "Status",
      "description": "Description",
      "manageSites": "Manage Sites",
      "addSite": "Add Site",
      "siteUrl": "Site URL",
      "rating": "Rating",
      "noResults": "No results found. Try a different search.",
      "magneticLinks": "Magnetic Links",
      "autoTranslateHint": "Auto-translating to English to expand search scope...",
      "loginRequired": "Login Required",
      "loginPrompt": "This site requires login. Do you want to open it and log in?",
      "cancel": "Cancel",
      "proceed": "Proceed",
    }
  },
  zh: {
    translation: {
      "search": "检索",
      "searchPlaceholder": "输入影视名称或标签 (例如: 盗梦空间, 科幻)",
      "settings": "设置",
      "languageSettings": "语言设置",
      "sitesManagement": "网站管理",
      "mySites": "我的网站",
      "discoverSites": "发现网站",
      "autoFetch": "全网检索资源网站",
      "fetchLoading": "正在全网检索并测速验证中...",
      "copy": "复制",
      "copied": "已复制!",
      "open": "打开",
      "add": "添加",
      "added": "已添加",
      "status": "状态",
      "description": "简介",
      "manageSites": "资源网站管理",
      "addSite": "添加网站",
      "siteUrl": "网站地址",
      "rating": "评分",
      "noResults": "未找到结果，请尝试其他关键词。",
      "magneticLinks": "磁力链接",
      "autoTranslateHint": "正在自动转换为英文以扩大检索范围...",
      "loginRequired": "需要登录",
      "loginPrompt": "该网站需要验证码或登录，是否跳转至相应网站登录并保存信息？",
      "cancel": "取消",
      "proceed": "前往",
    }
  },
  zh_TW: {
    translation: {
      "search": "檢索",
      "searchPlaceholder": "輸入影視名稱或標籤 (例如: 盜夢空間, 科幻)",
      "settings": "設置",
      "languageSettings": "語言設置",
      "sitesManagement": "網站管理",
      "mySites": "我的網站",
      "discoverSites": "發現網站",
      "autoFetch": "全網檢索資源網站",
      "fetchLoading": "正在全網檢索並測速驗證中...",
      "copy": "複製",
      "copied": "已複製!",
      "open": "打開",
      "add": "添加",
      "added": "已添加",
      "status": "狀態",
      "description": "簡介",
      "manageSites": "資源網站管理",
      "addSite": "添加網站",
      "siteUrl": "網站地址",
      "rating": "評分",
      "noResults": "未找到結果，請嘗試其他關鍵詞。",
      "magneticLinks": "磁力鏈接",
      "autoTranslateHint": "正在自動轉換為英文以擴大檢索範圍...",
      "loginRequired": "需要登錄",
      "loginPrompt": "該網站需要驗證碼或登錄，是否跳轉至相應網站登錄並保存信息？",
      "cancel": "取消",
      "proceed": "前往",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "zh",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
