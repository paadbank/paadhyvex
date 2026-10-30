'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const STORED_THEMES = ['light', 'dark', 'system'] as const;
type StoredTheme = (typeof STORED_THEMES)[number];
export type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  storedTheme: StoredTheme;
  setTheme: (theme: StoredTheme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  storedTheme: 'system',
  setTheme: () => {},
  toggleTheme: () => {},
  cycleTheme: () => {},
});

/** Runs in <head>, before anything is drawn. Keep it in step with `resolve` below. */
export const THEME_SCRIPT = `try{var s=localStorage.getItem('theme');var d=s==='dark'||((s===null||s==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

function resolve(stored: StoredTheme): Theme {
  if (stored !== 'system') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [storedTheme, setStoredTheme] = useState<StoredTheme>('system');
  const [theme, setResolved] = useState<Theme>('light');

  // The class is already right (THEME_SCRIPT); this brings React's copy in line with it.
  useEffect(() => {
    let saved: StoredTheme = 'system';
    try {
      const value = localStorage.getItem('theme') as StoredTheme | null;
      if (value && STORED_THEMES.includes(value)) saved = value;
    } catch {
      // Storage can be blocked; the system theme still applies.
    }
    // localStorage exists only after hydration, so this can't be the initial state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoredTheme(saved);
    setResolved(resolve(saved));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (storedTheme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setResolved(resolve('system'));
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [storedTheme]);

  const setTheme = useCallback((next: StoredTheme) => {
    setStoredTheme(next);
    setResolved(resolve(next));
    try {
      localStorage.setItem('theme', next);
    } catch {
      // The choice lasts for this visit.
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const cycleTheme = useCallback(() => {
    setTheme(STORED_THEMES[(STORED_THEMES.indexOf(storedTheme) + 1) % STORED_THEMES.length]);
  }, [storedTheme, setTheme]);

  return <ThemeContext.Provider value={{ theme, storedTheme, setTheme, toggleTheme, cycleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
