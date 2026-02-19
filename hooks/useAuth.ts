import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Google Sign-In ────────────────────────────────────────────────────────
  // Uses Supabase OAuth redirect flow — works on both platforms.

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'rudder://auth/callback',
      },
    });
    if (error) throw error;
  }

  // ─── Sign Out ──────────────────────────────────────────────────────────────

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    signInWithApple,
    signInWithGoogle,
    signOut,
  };
}
