import { loadStats, saveLangPreference } from './stats.js';

let strings = {};
let currentLang = 'en';

export async function initI18n() {
  const supported = ['en', 'zh', 'es'];
  const urlLang = new URLSearchParams(location.search).get('lang');
  const stats = loadStats();
  const browserLang = navigator.language?.slice(0, 2) || 'en';

  if (urlLang && supported.includes(urlLang)) {
    currentLang = urlLang;
    saveLangPreference(urlLang);
  } else {
    currentLang = stats.lang || (supported.includes(browserLang) ? browserLang : 'en');
  }

  await loadLanguage(currentLang);
  applyTranslations();

  // Highlight the active language button
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

async function loadLanguage(lang) {
  try {
    // Cache-bust to avoid stale 304 responses after file changes
    const res = await fetch(`/i18n/${lang}.json?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    strings = await res.json();
  } catch (err) {
    console.warn(`Failed to load ${lang}.json:`, err);
    if (lang !== 'en') {
      try {
        const res = await fetch(`/i18n/en.json?v=${Date.now()}`);
        strings = await res.json();
      } catch {
        // Both failed — keep existing strings
      }
    }
  }
}

export function t(key) {
  const result = key.split('.').reduce((obj, k) => obj?.[k], strings);
  // Return arrays/objects as-is, only fall back to key for missing strings
  if (result !== undefined && result !== null) return result;
  return key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation !== key) {
      el.textContent = translation;
    }
  });
}

export async function setLang(lang) {
  currentLang = lang;
  saveLangPreference(lang);
  await loadLanguage(lang);
  applyTranslations();
}

export function getCurrentLang() {
  return currentLang;
}
