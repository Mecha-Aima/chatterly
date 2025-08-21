import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Ensure user exists in our users table
    const { data: existingUser, error: fetchError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!existingUser) {
      // Create user record
      const { error: insertUserError } = await supabaseServer
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          display_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'user',
          verified_at: user.email_confirmed_at,
        });

      if (insertUserError) {
        console.error('Error creating user:', insertUserError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      // Create profile record
      const { error: insertProfileError } = await supabaseServer
        .from('profiles')
        .insert({
          user_id: user.id,
          preferred_language: 'en',
          difficulty_level: 'beginner',
        });

      if (insertProfileError) {
        console.error('Error creating profile:', insertProfileError);
        // Don't fail the whole operation for profile creation
      }

      // Create settings record
      const { error: insertSettingsError } = await supabaseServer
        .from('settings')
        .insert({
          user_id: user.id,
          onboarding_complete: false,
          notifications_enabled: true,
        });

      if (insertSettingsError) {
        console.error('Error creating settings:', insertSettingsError);
        // Don't fail the whole operation for settings creation
      }
    }

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
