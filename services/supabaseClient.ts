import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // We don't throw error here to allow app to load, but services should check
  console.warn('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
