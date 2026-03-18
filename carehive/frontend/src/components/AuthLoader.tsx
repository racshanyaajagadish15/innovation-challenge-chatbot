'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { subscribeToUser } from '@/lib/socket';

/**
 * Restore Supabase session on mount. No demo user: when not logged in, user stays null and only landing is shown.
 */
export function AuthLoader() {
  const { setUser, setAccessToken, setAuthReady } = useStore();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    (async () => {
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          setAccessToken(session.access_token);
          try {
            const u = await api.getMe();
            setUser(u.id, u.name);
            subscribeToUser(u.id);
          } catch {
            setUser(session.user?.id ?? '', session.user?.email ?? null);
            subscribeToUser(session.user?.id ?? '');
          }
          setAuthReady(true);
          return;
        }
        setAccessToken(null);
        setUser('', null);
      }
      setAuthReady(true);
    })();
  }, [setUser, setAccessToken, setAuthReady]);

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
        try {
          const u = await api.getMe();
          setUser(u.id, u.name);
          subscribeToUser(u.id);
        } catch {
          setUser(session.user?.id ?? '', session.user?.email ?? null);
          subscribeToUser(session.user?.id ?? '');
        }
      } else {
        setAccessToken(null);
        setUser('', null);
      }
    });
    return () => subscription.unsubscribe();
  }, [setUser, setAccessToken]);

  return null;
}
