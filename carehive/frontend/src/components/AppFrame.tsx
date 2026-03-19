'use client';

import { ReactNode, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Nav } from '@/components/Nav';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AppFrame({ children }: { children: ReactNode }) {
  const { accessToken, userRole, authReady } = useStore();
  const authed = Boolean(accessToken);

  useEffect(() => {
    if (!authReady) return;
    document.documentElement.setAttribute('data-role', userRole);
  }, [authReady, userRole]);

  if (!authed) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 overflow-auto relative">
        <div className="fixed top-4 right-4 z-40">
          <ThemeToggle />
        </div>
        <div className="pt-2 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
