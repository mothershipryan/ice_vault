import { createClient } from '@supabase/supabase-js';

// HARD OVERRIDE: Forced to the new working project to bypass stale Vercel caches
const FORCED_URL = 'https://mepaapbfnwpiysccbvds.supabase.co';
const FORCED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcGFhcGJmbndwaXlzY2NidmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Njc1MjUsImV4cCI6MjA4NTQ0MzUyNX0.5iBezcUApFOvsvAQK9oqBXD8_57dK5bsJh51v3R8WP0';

const supabaseUrl = FORCED_URL;
const supabaseAnonKey = FORCED_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
