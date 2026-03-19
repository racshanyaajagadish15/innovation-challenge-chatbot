'use client';

import { useEffect } from 'react';

type Theme = 'light' | 'dark';

export function ThemeInitializer() {
  useEffect(() => {
    const saved = window.localStorage.getItem('carehive-theme') as Theme | null;
    const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const theme: Theme = saved ?? (systemPrefersDark ? 'dark' : 'light');

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  return null;
}

