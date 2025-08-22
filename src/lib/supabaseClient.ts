import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('🔧 Supabase Client: Initializing with URL:', url ? 'Present' : 'Missing');
console.log('🔧 Supabase Client: Anon key:', anonKey ? 'Present' : 'Missing');

export const supabase = createClient(url, anonKey);

console.log('🔧 Supabase Client: Client created successfully');
