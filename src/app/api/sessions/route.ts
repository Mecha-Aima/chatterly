import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { sessionCreateSchema, SessionResponse } from '@/types/session.types';
import { 
  ValidationErrorHandler, 
  AuthErrorHandler, 
  DatabaseErrorHandler,
  GlobalErrorHandler 
} from '@/lib/errorHandling';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const sessionData = ValidationErrorHandler.handleValidation(
      sessionCreateSchema.safeParse(body)
    );

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Generate session ID
    const sessionId = uuidv4();

    // Create session record
    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        target_language: sessionData.target_language,
        difficulty_level: sessionData.difficulty_level,
        persona_id: sessionData.persona_id || null,
        started_at: new Date().toISOString(),
        total_turns: 0,
        completed_turns: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Session creation error:', insertError);
      throw DatabaseErrorHandler.fromSupabaseError(insertError);
    }

    // Return session response
    const response: SessionResponse = {
      id: session.id,
      user_id: session.user_id,
      target_language: session.target_language,
      difficulty_level: session.difficulty_level,
      persona_id: session.persona_id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      total_turns: session.total_turns,
      completed_turns: session.completed_turns,
      audio_url: session.audio_url,
      session_transcript_json: session.session_transcript_json as Record<string, any> | null,
      overall_progress_json: session.overall_progress_json as Record<string, any> | null,
      created_at: session.created_at
    };

    return NextResponse.json(response, { status: 201 });
  })();
}

export async function GET(request: NextRequest) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Build query
    let query = supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status) {
      // Note: This assumes we have a status field or derive it from other fields
      // For now, we'll use ended_at to determine status
      if (status === 'completed') {
        query = query.not('ended_at', 'is', null);
      } else if (status === 'in_progress') {
        query = query.is('ended_at', null).not('started_at', 'is', null);
      } else if (status === 'created') {
        query = query.is('started_at', null);
      }
    }

    const { data: sessions, error: queryError } = await query;

    if (queryError) {
      console.error('Sessions query error:', queryError);
      throw DatabaseErrorHandler.fromSupabaseError(queryError);
    }

    return NextResponse.json(sessions || [], { status: 200 });
  })();
}
