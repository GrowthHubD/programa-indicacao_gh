import { useCallback, useEffect, useState } from 'react';
import { translations } from '../translations.js';

const STORAGE_KEY = 'vpi-lang';
const DEFAULT_LANG = 'pt';
const SUPPORTED = ['pt', 'en'];
const listeners = new Set();

function readLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
  } catch (_) {}
  const docLang = document.documentElement.getAttribute('lang');
  if (docLang && docLang.toLowerCase().startsWith('en')) return 'en';
  return DEFAULT_LANG;
}

function applyLang(next, { persist = true } = {}) {
  const safe = SUPPORTED.includes(next) ? next : DEFAULT_LANG;
  document.documentElement.setAttribute('lang', translations[safe].htmlLang);
  document.title = translations[safe].pageTitle;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, safe); } catch (_) {}
  }
  listeners.forEach((l) => l(safe));
}

let detectionStarted = false;
async function detectFromGeo() {
  if (detectionStarted) return;
  detectionStarted = true;
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
  } catch (_) {}
  try {
    const res = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
    if (!res.ok) return;
    const text = await res.text();
    const match = /(?:^|\n)loc=([A-Z]{2})/.exec(text);
    const country = match ? match[1] : null;
    if (country && country !== 'BR') {
      applyLang('en', { persist: false });
    }
  } catch (_) {}
}

export function useLanguage() {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    const listener = (next) => setLang(next);
    listeners.add(listener);
    const current = readLang();
    if (current !== lang) setLang(current);
    detectFromGeo();
    return () => { listeners.delete(listener); };
  }, []);

  const setExplicit = useCallback((l) => {
    if (SUPPORTED.includes(l)) applyLang(l);
  }, []);

  const toggle = useCallback(() => {
    applyLang(readLang() === 'pt' ? 'en' : 'pt');
  }, []);

  const t = useCallback((path) => {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), dict);
  }, [lang]);

  return { lang, setLang: setExplicit, toggle, t };
}
