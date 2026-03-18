'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * OAuth callback: Supabase redirects here with session in the URL.
 * We let the client restore the session, then redirect to dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (!supabase) {
      router.replace('/login');
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        router.replace('/dashboard');
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
      else setTimeout(() => router.replace('/login'), 2000);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#06101f]">
      <div className="w-8 h-8 border-2 border-cyan-500/80 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-sm text-slate-400">Signing you in…</p>
    </div>
  );
}
