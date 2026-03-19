'use client';

import { useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.6A8.5 8.5 0 0 1 11.4 3a7 7 0 1 0 9.6 9.6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('carehive-theme') as Theme | null;
    const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initial: Theme = saved ?? (systemPrefersDark ? 'dark' : 'light');
    setTheme(initial);
  }, []);

  const nextTheme = useMemo<Theme>(() => (theme === 'dark' ? 'light' : 'dark'), [theme]);

  function apply(newTheme: Theme) {
    document.documentElement.dataset.theme = newTheme;
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    window.localStorage.setItem('carehive-theme', newTheme);
    setTheme(newTheme);
  }

  return (
    <button
      type="button"
      onClick={() => apply(nextTheme)}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/70 backdrop-blur px-2 py-2 text-slate-700 hover:bg-white dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-200"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

