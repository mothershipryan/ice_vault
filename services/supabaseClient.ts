import { createClient } from '@supabase/supabase-js';

// Provide safe fallbacks for different environments (Vite vs Node vs Deno)
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Check your environment variables.');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

