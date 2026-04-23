import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'vpi-theme';
const listeners = new Set();

function readTheme() {
  if (typeof window === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(next) {
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
  listeners.forEach((l) => l(next));
}

let systemListenerAttached = false;
function attachSystemListener() {
  if (systemListenerAttached || typeof window === 'undefined') return;
  systemListenerAttached = true;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    } catch (_) {}
  });
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    attachSystemListener();
    const listener = (next) => setTheme(next);
    listeners.add(listener);
    // Sync in case attribute changed before mount
    const current = readTheme();
    if (current !== theme) setTheme(current);
    return () => { listeners.delete(listener); };

  }, []);

  const toggle = useCallback(() => {
    applyTheme(readTheme() === 'dark' ? 'light' : 'dark');
  }, []);

  const setExplicit = useCallback((t) => {
    if (t === 'light' || t === 'dark') applyTheme(t);
  }, []);

  return { theme, toggle, setTheme: setExplicit };
}
