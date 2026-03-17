'use client';

import { ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import { Nav } from '@/components/Nav';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AppFrame({ children }: { children: ReactNode }) {
  const { accessToken } = useStore();
  const authed = Boolean(accessToken);

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {authed ? (
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      ) : (
        <>{children}</>
      )}
    </>
  );
}

