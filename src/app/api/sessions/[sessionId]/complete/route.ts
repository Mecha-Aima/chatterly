import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { 
  APIError, 
  ErrorCode, 
  AuthErrorHandler, 
  DatabaseErrorHandler,
  SessionErrorHandler,
  GlobalErrorHandler 
} from '@/lib/errorHandling';
import { updateSessionProgress } from '@/lib/progressCalculation';

export async function POST(
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

    // Fetch session with current state
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, total_turns, completed_turns, started_at, ended_at')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw SessionErrorHandler.createSessionNotFoundError();
    }

    // Check if session is already completed
    if (session.ended_at) {
      throw SessionErrorHandler.createSessionCompletedError();
    }

    // Validate session completion eligibility (minimum turn requirement)
    const minimumTurns = 1; // Can be configured based on requirements
    if ((session.total_turns || 0) < minimumTurns) {
      throw new APIError(
        ErrorCode.INVALID_STATE,
        `Session must have at least ${minimumTurns} turn(s) to be completed`
      );
    }

    // Calculate learning metrics
    const { data: turns, error: turnsError } = await supabase
      .from('learning_turns')
      .select('turn_completed, pronunciation_feedback_json, grammar_feedback_json, created_at')
      .eq('session_id', sessionId);

    if (turnsError) {
      console.error('Error fetching turns for completion:', turnsError);
      throw new APIError(ErrorCode.DATABASE_ERROR, 'Failed to calculate session metrics');
    }

    // Calculate final metrics
    const totalTurns = turns?.length || 0;
    const completedTurnsCount = turns?.filter(turn => turn.turn_completed).length || 0;
    const completionRate = totalTurns > 0 ? (completedTurnsCount / totalTurns) * 100 : 0;

    // Calculate average scores
    let totalPronunciationScore = 0;
    let totalGrammarScore = 0;
    let scoredTurns = 0;

    turns?.forEach(turn => {
      if (turn.pronunciation_feedback_json && typeof turn.pronunciation_feedback_json === 'object') {
        const pronunciationScore = (turn.pronunciation_feedback_json as any)?.overall_score;
        if (typeof pronunciationScore === 'number') {
          totalPronunciationScore += pronunciationScore;
          scoredTurns++;
        }
      }
      if (turn.grammar_feedback_json && typeof turn.grammar_feedback_json === 'object') {
        const grammarScore = (turn.grammar_feedback_json as any)?.overall_score;
        if (typeof grammarScore === 'number') {
          totalGrammarScore += grammarScore;
        }
      }
    });

    const avgPronunciationScore = scoredTurns > 0 ? totalPronunciationScore / scoredTurns : 0;
    const avgGrammarScore = scoredTurns > 0 ? totalGrammarScore / scoredTurns : 0;

    // Calculate session duration
    const startTime = session.started_at ? new Date(session.started_at) : new Date();
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Prepare session summary
    const overallProgress = {
      completion_rate: completionRate,
      average_pronunciation_score: avgPronunciationScore,
      average_grammar_score: avgGrammarScore,
      duration_minutes: durationMinutes,
      total_turns: totalTurns,
      completed_turns: completedTurnsCount,
      completed_at: endTime.toISOString()
    };

    // Update session with completion data
    const { data: completedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        ended_at: endTime.toISOString(),
        completed_turns: completedTurnsCount,
        overall_progress_json: overallProgress
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Session completion update error:', updateError);
      throw DatabaseErrorHandler.fromSupabaseError(updateError);
    }

    // Badge evaluation will be triggered automatically by database triggers
    // No need to manually call badge functions here

    // Update session progress with detailed metrics (async, don't block response)
    updateSessionProgress(sessionId).catch(error => {
      console.error('Error updating session progress:', error);
      // Don't throw error here as session completion should still succeed
    });

    // Return completion summary
    return NextResponse.json({
      session: completedSession,
      summary: {
        completion_rate: completionRate,
        average_pronunciation_score: avgPronunciationScore,
        average_grammar_score: avgGrammarScore,
        duration_minutes: durationMinutes,
        message: `Session completed! You completed ${completedTurnsCount} out of ${totalTurns} turns.`
      }
    }, { status: 200 });
  })();
}
