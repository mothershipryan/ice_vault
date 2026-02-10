import { createClient } from '@supabase/supabase-js';

// HARD OVERRIDE: Pointing to German VPS Self-Hosted Supabase
const FORCED_URL = 'http://escoc8ggkco040s8gg4scoc8.46.225.69.82.sslip.io/';
const FORCED_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDY4NjcwMCwiZXhwIjo0OTI2MzYwMzAwLCJyb2xlIjoiYW5vbiJ9.kTof1tUJr_RS41rgbZcWBortzcdqfn7kc36nFKqt5tg';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FORCED_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FORCED_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
