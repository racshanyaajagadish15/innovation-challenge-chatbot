'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken, authReady } = useStore();

  useEffect(() => {
    if (!authReady) return;
    if (!accessToken) router.replace('/');
  }, [authReady, accessToken, router]);

  if (!authReady) return <div className="p-8 max-w-2xl mx-auto">Loading…</div>;
  if (!accessToken) return null;
  return <>{children}</>;
}

