'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔧 AuthContext: Initializing auth state...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔧 AuthContext: Initial session:', session ? 'Found' : 'None');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔧 AuthContext: Auth state changed:', { event, hasSession: !!session, hasUser: !!session?.user });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Call API to ensure user profile exists
      if (session?.user && event === 'SIGNED_IN') {
        console.log('🔧 AuthContext: User signed in, ensuring profile exists...', { userId: session.user.id, email: session.user.email });
        
        try {
          const response = await fetch('/api/users/ensure', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('🔧 AuthContext: Profile ensure response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('🔧 AuthContext: Profile ensure failed:', { status: response.status, error: errorText });
          } else {
            const result = await response.json();
            console.log('🔧 AuthContext: Profile ensure success:', result);
          }
        } catch (error) {
          console.error('🔧 AuthContext: Error ensuring user profile:', error);
        }
      }
    });

    console.log('🔧 AuthContext: Auth listener setup complete');
    return () => {
      console.log('🔧 AuthContext: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
      }
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
