import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { turnUpdateSchema, TurnUpdateRequest } from '@/types/session.types';
import { 
  ValidationErrorHandler, 
  AuthErrorHandler, 
  DatabaseErrorHandler,
  SessionErrorHandler,
  GlobalErrorHandler 
} from '@/lib/errorHandling';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; turnId: string }> }
) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    const { sessionId, turnId } = await params;
    const body = await request.json();

    // Validate request data
    const updateData = ValidationErrorHandler.handleValidation(
      turnUpdateSchema.safeParse(body)
    );

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Verify turn ownership through session ownership
    const { data: turn, error: turnError } = await supabase
      .from('learning_turns')
      .select(`
        id,
        session_id,
        turn_completed,
        sessions!inner(user_id)
      `)
      .eq('id', turnId)
      .eq('session_id', sessionId)
      .eq('sessions.user_id', user.id)
      .single();

    if (turnError || !turn) {
      throw SessionErrorHandler.createTurnNotFoundError();
    }

    // Check if this is a completion update
    const wasCompleted = turn.turn_completed;
    const isNowCompleted = updateData.turn_completed;

    // Update turn
    const { data: updatedTurn, error: updateError } = await supabase
      .from('learning_turns')
      .update(updateData)
      .eq('id', turnId)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Turn update error:', updateError);
      throw DatabaseErrorHandler.fromSupabaseError(updateError);
    }

    // Update session completed_turns counter if turn was just completed
    if (!wasCompleted && isNowCompleted) {
      // Get current completed turns count
      const { data: session, error: sessionQueryError } = await supabase
        .from('sessions')
        .select('completed_turns')
        .eq('id', sessionId)
        .single();

      if (!sessionQueryError && session) {
        const newCompletedTurns = (session.completed_turns || 0) + 1;
        
        const { error: sessionUpdateError } = await supabase
          .from('sessions')
          .update({ completed_turns: newCompletedTurns })
          .eq('id', sessionId)
          .eq('user_id', user.id);

        if (sessionUpdateError) {
          console.error('Session completed_turns update error:', sessionUpdateError);
          // Don't fail the request since the turn update succeeded
        }
      }
    }
    // Handle case where turn was uncompleted
    else if (wasCompleted && isNowCompleted === false) {
      // Get current completed turns count
      const { data: session, error: sessionQueryError } = await supabase
        .from('sessions')
        .select('completed_turns')
        .eq('id', sessionId)
        .single();

      if (!sessionQueryError && session) {
        const newCompletedTurns = Math.max(0, (session.completed_turns || 0) - 1);
        
        const { error: sessionUpdateError } = await supabase
          .from('sessions')
          .update({ completed_turns: newCompletedTurns })
          .eq('id', sessionId)
          .eq('user_id', user.id);

        if (sessionUpdateError) {
          console.error('Session completed_turns update error:', sessionUpdateError);
          // Don't fail the request since the turn update succeeded
        }
      }
    }

    return NextResponse.json(updatedTurn, { status: 200 });
  })();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; turnId: string }> }
) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    const { sessionId, turnId } = await params;

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Fetch turn with ownership verification
    const { data: turn, error: turnError } = await supabase
      .from('learning_turns')
      .select(`
        *,
        sessions!inner(user_id)
      `)
      .eq('id', turnId)
      .eq('session_id', sessionId)
      .eq('sessions.user_id', user.id)
      .single();

    if (turnError) {
      if (turnError.code === 'PGRST116') {
        throw SessionErrorHandler.createTurnNotFoundError();
      }
      throw DatabaseErrorHandler.fromSupabaseError(turnError);
    }

    // Remove the sessions data from response (it was just for auth)
    const { sessions, ...turnData } = turn;

    return NextResponse.json(turnData, { status: 200 });
  })();
}
