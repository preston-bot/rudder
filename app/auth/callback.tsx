/**
 * OAuth callback handler for Google Sign-In.
 * Google redirects to rudder://auth/callback?code=... after auth.
 * Supabase picks up the session from the URL automatically.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';

export default function AuthCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    // Supabase handles the token exchange automatically via onAuthStateChange.
    // We just need to wait for it and redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        router.replace('/(app)');
      }
    });

    // Fallback: if session already exists (race condition), redirect immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        router.replace('/(app)');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary }}>
      <ActivityIndicator color={Colors.brand.primary} size="large" />
    </View>
  );
}
