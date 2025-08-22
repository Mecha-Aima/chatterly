import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

// GET /api/sentences/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !authData?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supa = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

  const { data, error } = await supa
    .from('sentence_bank')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}
