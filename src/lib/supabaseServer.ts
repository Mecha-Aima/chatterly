import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('🔧 Supabase Server: Initializing with URL:', url ? 'Present' : 'Missing');
console.log('🔧 Supabase Server: Anon key:', anonKey ? 'Present' : 'Missing');

// For server-side operations, we'll use the same anon key but in a server context
export const supabaseServer = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 Supabase Server: Server client created successfully');
