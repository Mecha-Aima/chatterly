import { NextRequest, NextResponse } from 'next/server';
import { generateTeachingResponse, TeachingRequest } from '@/lib/teachingMode';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { language, difficulty, turnNumber, sessionContext } = body;

    // Validate required fields
    if (!language || !difficulty) {
      return NextResponse.json(
        { error: 'Language and difficulty are required' },
        { status: 400 }
      );
    }

    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const authToken = authHeader.replace('Bearer ', '');

    // Verify the token with Supabase using a client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Create teaching request
    const teachingRequest: TeachingRequest = {
      language,
      difficulty,
      authToken,
      turnNumber,
      sessionContext
    };

    // Generate teaching response
    const teachingResponse = await generateTeachingResponse(teachingRequest);

    return NextResponse.json(teachingResponse);

  } catch (error) {
    console.error('Teaching API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}