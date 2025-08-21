import { NextRequest } from 'next/server';
import { supabaseServer } from './supabaseServer';
import { NextApiRequest } from 'next';

export async function verifySupabaseAuth(request: NextApiRequest) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }
    
    return user;
  } catch (error) {
    throw error;
  }
}
