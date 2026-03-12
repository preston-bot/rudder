import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
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

  // ─── Apple Sign-In ─────────────────────────────────────────────────────────
  // iOS only. Uses nonce to prevent replay attacks.

  async function signInWithApple() {
    const rawNonce = Math.random().toString(36).substring(2);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
      nonce: rawNonce,
    });

    if (error) throw error;
  }

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
    isAppleAvailable: Platform.OS === 'ios',
    signInWithApple,
    signInWithGoogle,
    signOut,
  };
}
