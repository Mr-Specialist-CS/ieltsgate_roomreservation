import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co');
};

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  clientInstance = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client successfully initialized.');
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY environment variables are missing. Running with in-memory fallback.');
}

export const supabase = clientInstance;
