import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { sessionUpdateSchema, SessionUpdateRequest } from '@/types/session.types';
import {  
  ValidationErrorHandler, 
  AuthErrorHandler, 
  DatabaseErrorHandler,
  SessionErrorHandler,
  GlobalErrorHandler 
} from '@/lib/errorHandling';

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

    // Fetch session with ownership check
    const { data: session, error: queryError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        throw SessionErrorHandler.createSessionNotFoundError();
      }
      throw DatabaseErrorHandler.fromSupabaseError(queryError);
    }

    return NextResponse.json(session, { status: 200 });
  })();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    const { sessionId } = await params;
    const body = await request.json();

    // Validate request data
    const updateData = ValidationErrorHandler.handleValidation(
      sessionUpdateSchema.safeParse(body)
    );

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Check session ownership first
    const { data: existingSession, error: checkError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existingSession) {
      throw SessionErrorHandler.createSessionNotFoundError();
    }

    // Update session with transaction-like behavior
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Session update error:', updateError);
      throw DatabaseErrorHandler.fromSupabaseError(updateError);
    }

    return NextResponse.json(updatedSession, { status: 200 });
  })();
}
