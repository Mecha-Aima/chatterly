import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// GET /api/sentences?language=..&difficulty=..&category=..&limit=..
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const language = (searchParams.get('language') || '').trim();
  const difficulty = (searchParams.get('difficulty') || '').trim();
  const category = (searchParams.get('category') || '')?.trim() || null;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : null;

  // Validation per spec
  const validDifficulty = ['beginner', 'intermediate', 'advanced'];
  if (!language || language.length !== 2) {
    return NextResponse.json({ error: 'Invalid language (ISO 639-1, 2 letters)' }, { status: 400 });
  }
  if (!validDifficulty.includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty (beginner|intermediate|advanced)' }, { status: 400 });
  }
  if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
  }

  // Require Authorization header (authenticated users only per RLS)
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !authData?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  // Create a per-request client with bearer token for RLS
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supa = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

  // Query via RPC for randomness
  const { data, error } = await supa
    .rpc('get_sentences', { p_language: language, p_difficulty: difficulty, p_category: category, p_limit: limit });

  if (error) {
    console.error('Error fetching sentences:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  let results = data || [];

  // Fallback: if not enough sentences for given difficulty, return all available for language
  if (limit && results.length < limit) {
    const { data: fallbackData, error: fbError } = await supa.rpc('get_sentences_by_language', {
      p_language: language,
      p_limit: limit,
    });
    if (fbError) {
      console.error('Fallback fetch error:', fbError);
      // Still return what we have
      return NextResponse.json(results);
    }
    results = fallbackData || results;
  }

  return NextResponse.json(results);
}

// POST /api/sentences (dev-only manual insert)
export async function POST(req: NextRequest) {
  // Protect in non-dev environments
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  // Require Authorization header (behind auth check)
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { id, language, difficulty_level, sentence_text, meaning_english, pronunciation_guide, category } = body;
  if (!id || !language || !difficulty_level || !sentence_text || !meaning_english || !pronunciation_guide || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Use admin client for insert (RLS-restricted to service role)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured for inserts (missing service role key)' }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from('sentence_bank').insert({
    id,
    language,
    difficulty_level,
    sentence_text,
    meaning_english,
    pronunciation_guide,
    category,
  });

  if (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
