import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

/**
 * Sign out: clear Supabase session and app state, then redirect to landing.
 * Use from Nav, Profile, or any authenticated view.
 */
export async function signOut(router: { push: (path: string) => void }) {
  if (supabase) await supabase.auth.signOut();
  useStore.getState().setAccessToken(null);
  useStore.getState().setUser('', null);
  router.push('/');
}
