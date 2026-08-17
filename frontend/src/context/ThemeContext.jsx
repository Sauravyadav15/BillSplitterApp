// frontend/src/context/ThemeContext.jsx
// Light/dark theme, following the system preference until the user
// explicitly overrides it via the Navbar toggle - the override then sticks
// (localStorage) across sessions. Applying is just setting/clearing a
// `data-theme` attribute on <html>; index.css's `:root[data-theme='dark']`
// block (and the `prefers-color-scheme` media query for the no-override
// case) does the actual color-token swap - this context only owns which
// mode is active, not any of the colors themselves.

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'billsplit_theme';

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }) {
  // 'light' | 'dark' | 'system' - 'system' means no explicit override yet.
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');
  // Only tracks the raw OS-level preference - only actually consulted below
  // when theme === 'system'. Kept separate from `theme` itself so the
  // effect that subscribes to it never needs `theme` in its dependency
  // array (it always listens, regardless of whether it's currently used).
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Applies the override to the DOM - the one thing this effect does,
  // nothing else, so it never needs to call setState in its own body.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Subscribes once to OS theme changes - setState only ever happens
  // inside the change-event callback, not synchronously in the effect
  // body, so a live OS toggle updates the icon even while theme==='system'.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemDark(query.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const isDark = theme === 'system' ? systemDark : theme === 'dark';

  const setTheme = (next) => {
    setThemeState(next);
    if (next === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
  };

  // The toggle only ever offers light/dark (not a 3-way light/dark/system
  // cycle - simpler UI for marginal benefit), so once clicked it's always
  // an explicit override going forward.
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
