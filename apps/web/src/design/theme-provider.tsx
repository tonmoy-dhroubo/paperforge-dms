'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { paperforgeThemes, themeToCssVars } from './theme';

type ThemeKey = keyof typeof paperforgeThemes;

type ThemeContextValue = {
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  themeName: string;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'paperforge.theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('paper');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)) || '';
    if (saved === 'noir' || saved === 'paper') setThemeKeyState(saved);
  }, []);

  useEffect(() => {
    const vars = themeToCssVars(paperforgeThemes[themeKey]);
    const el = document.documentElement;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    window.localStorage.setItem(STORAGE_KEY, themeKey);
  }, [themeKey]);

  const setThemeKey = useCallback((key: ThemeKey) => setThemeKeyState(key), []);
  const toggle = useCallback(() => setThemeKeyState((k) => (k === 'noir' ? 'paper' : 'noir')), []);

  const value = useMemo(
    () => ({ themeKey, setThemeKey, themeName: paperforgeThemes[themeKey].name, toggle }),
    [themeKey, setThemeKey, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
