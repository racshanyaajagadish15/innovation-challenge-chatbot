'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { subscribeToUser } from '@/lib/socket';

/**
 * Runs once on mount: restore Supabase session, then load user (me or demo) and subscribe to socket.
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
            setAuthReady(true);
            return;
          } catch {
            // Profile not set or API error – continue to demo
          }
        }
        setAccessToken(null);
      }
      const u = await api.getDemoUser();
      setUser(u.id, u.name);
      subscribeToUser(u.id);
      setAuthReady(true);
    })();
  }, [setUser, setAccessToken]);

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
        const u = await api.getDemoUser();
        setUser(u.id, u.name);
        subscribeToUser(u.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [setUser, setAccessToken]);

  return null;
}
