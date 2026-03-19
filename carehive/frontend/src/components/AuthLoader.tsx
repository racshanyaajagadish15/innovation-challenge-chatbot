'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { subscribeToUser } from '@/lib/socket';
import type { UserRole } from '@/types/roles';

const VALID_ROLES: UserRole[] = ['patient', 'clinician', 'family'];

export function AuthLoader() {
  const { setUser, setAccessToken, setAuthReady, setUserRole } = useStore();
  const done = useRef(false);
  const roleApplied = useRef(false);

  async function syncUser(session: { access_token: string; user?: { id?: string; email?: string | null; app_metadata?: Record<string, unknown> } }) {
    setAccessToken(session.access_token);
    try {
      const u = await api.getMe();
      setUser(u.id, u.name);

      if (roleApplied.current) return;

      const pendingRole = typeof window !== 'undefined'
        ? localStorage.getItem('carehive_signup_role') as UserRole | null
        : null;

      // app_metadata is set by the backend admin client — survives page refreshes
      const metaRole = session.user?.app_metadata?.role as UserRole | undefined;

      const needsRoleUpdate = pendingRole
        && VALID_ROLES.includes(pendingRole)
        && pendingRole !== 'patient'
        && (!metaRole || metaRole === 'patient')
        && (!u.role || u.role === 'patient');

      if (needsRoleUpdate && pendingRole) {
        roleApplied.current = true;
        setUserRole(pendingRole);
        localStorage.removeItem('carehive_signup_role');

        try {
          const updated = await api.updateProfile({
            name: u.name || 'User',
            age: u.age || 1,
            condition: u.condition || 'other',
            role: pendingRole,
          });
          if (updated.role && VALID_ROLES.includes(updated.role)) {
            setUserRole(updated.role as UserRole);
          }
          // Refresh JWT so app_metadata.role is in the token from now on
          if (supabase) await supabase.auth.refreshSession();
        } catch (e) {
          console.warn('Failed to persist role to backend:', e);
        }
      } else if (metaRole && VALID_ROLES.includes(metaRole)) {
        // Role is baked into the JWT — use it, ignore DB value
        roleApplied.current = true;
        setUserRole(metaRole);
        if (pendingRole) localStorage.removeItem('carehive_signup_role');
      } else {
        // Fallback to DB role
        const dbRole = (u.role && VALID_ROLES.includes(u.role as UserRole) ? u.role : 'patient') as UserRole;
        setUserRole(dbRole);
        if (pendingRole) localStorage.removeItem('carehive_signup_role');
      }

      subscribeToUser(u.id);
    } catch {
      setUser(session.user?.id ?? '', session.user?.email ?? null);
      subscribeToUser(session.user?.id ?? '');
    }
  }

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    (async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await syncUser(session);
          setAuthReady(true);
          return;
        }
        setAccessToken(null);
        setUser('', null);
      }
      setAuthReady(true);
    })();
  }, [setUser, setAccessToken, setAuthReady, setUserRole]);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.access_token) {
        await syncUser(session);
        setAuthReady(true);
      } else {
        setAccessToken(null);
        setUser('', null);
        roleApplied.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, [setUser, setAccessToken, setUserRole]);

  return null;
}
