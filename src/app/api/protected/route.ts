import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

async function verifySupabaseAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }
  
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifySupabaseAuth(request);
    
    // If we get here, the user is authenticated
    return NextResponse.json({ 
      ok: true, 
      user: {
        id: user.id,
        email: user.email,
        last_sign_in_at: user.last_sign_in_at
      } 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
