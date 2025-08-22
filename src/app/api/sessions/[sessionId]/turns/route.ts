import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { turnCreateSchema, TurnCreateRequest } from '@/types/session.types';
import { 
  APIError, 
  ErrorCode, 
  ValidationErrorHandler, 
  AuthErrorHandler, 
  DatabaseErrorHandler,
  SessionErrorHandler,
  GlobalErrorHandler 
} from '@/lib/errorHandling';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    const { sessionId } = await params;
    const body = await request.json();

    // Validate request data
    const turnData = ValidationErrorHandler.handleValidation(
      turnCreateSchema.safeParse(body)
    );

    // Ensure sessionId matches the one in URL
    if (turnData.session_id !== sessionId) {
      throw new APIError(ErrorCode.VALIDATION_ERROR, 'Session ID mismatch');
    }

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, total_turns')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw SessionErrorHandler.createSessionNotFoundError();
    }

    // Create learning turn
    const { data: turn, error: insertError } = await supabase
      .from('learning_turns')
      .insert({
        session_id: sessionId,
        turn_number: turnData.turn_number,
        target_sentence: turnData.target_sentence,
        sentence_meaning: turnData.sentence_meaning || null,
        turn_completed: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Turn creation error:', insertError);
      throw DatabaseErrorHandler.fromSupabaseError(insertError);
    }

    // Update session total_turns atomically
    const { error: sessionUpdateError } = await supabase
      .from('sessions')
      .update({ 
        total_turns: Math.max(session.total_turns || 0, turnData.turn_number)
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (sessionUpdateError) {
      console.error('Session total_turns update error:', sessionUpdateError);
      // We created the turn successfully, so don't fail the request
      // Log the error for investigation
    }

    return NextResponse.json(turn, { status: 201 });
  })();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    const { sessionId } = await params;

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Verify session ownership first
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw SessionErrorHandler.createSessionNotFoundError();
    }

    // Fetch all turns for the session
    const { data: turns, error: turnsError } = await supabase
      .from('learning_turns')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true });

    if (turnsError) {
      console.error('Turns query error:', turnsError);
      throw DatabaseErrorHandler.fromSupabaseError(turnsError);
    }

    return NextResponse.json(turns || [], { status: 200 });
  })();
}
