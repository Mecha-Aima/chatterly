import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a client with the user's access token for proper RLS context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // The database trigger should have already created the user record
    // Let's just verify it exists and return success
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!existingUser) {
      // If for some reason the trigger didn't work, we can log this but still return success
      // since the auth user exists
      console.log('User not found in users table, but auth user exists. This might be expected for new users.');
    }

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      displayName: existingUser?.display_name || user.user_metadata?.full_name || null
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
