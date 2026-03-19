/**
 * Supabase browser client for Auth.
 * Use anon key only; never expose service role on frontend.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY – auth disabled');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
