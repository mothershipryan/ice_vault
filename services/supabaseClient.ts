import { createClient } from '@supabase/supabase-js';

// Hardcoded fallback to bypass any stale VITE_SUPABASE_URL cache
const CORRECT_URL = 'https://mepaapbfnwpiysccbvds.supabase.co';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || CORRECT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Force Direct Supabase URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey || '');
