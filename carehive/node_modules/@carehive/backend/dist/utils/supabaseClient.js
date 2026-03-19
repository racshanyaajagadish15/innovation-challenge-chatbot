/**
 * Supabase client for backend (service role).
 * Never expose SUPABASE_SERVICE_KEY on the frontend.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment. Add them to backend/.env');
}
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
