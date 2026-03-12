import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Colors, Spacing } from '../../constants/theme';

export default function SignInScreen() {
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);

  async function handleApple() {
    setLoading('apple');
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign-in failed', e.message);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setLoading('google');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert('Sign-in failed', e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0A0A0F', '#0D1520', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.content}>
        {/* Wordmark */}
        <View style={styles.wordmark}>
          <Text size="5xl" weight="heavy" style={{ letterSpacing: -2 }}>
            Rudder
          </Text>
          <Text size="md" variant="secondary" style={{ marginTop: Spacing['2'] }}>
            Open water. Real training.
          </Text>
        </View>

        {/* Tagline */}
        <View style={styles.tagline}>
          <Text size="sm" variant="secondary" align="center" style={{ lineHeight: 22 }}>
            Train steady. Arrive sharp.{'\n'}Leave nothing behind.
          </Text>
        </View>

        {/* Auth buttons */}
        <View style={styles.authButtons}>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleApple}
            />
          )}
          <Button
            label={loading === 'google' ? '' : 'Continue with Google'}
            variant="secondary"
            fullWidth
            loading={loading === 'google'}
            onPress={handleGoogle}
          />
        </View>

        <Text size="xs" variant="tertiary" align="center" style={styles.legal}>
          By continuing, you agree to Rudder's Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing['8'],
    paddingBottom: Spacing['10'],
  },
  wordmark: {
    marginTop: Spacing['16'],
  },
  tagline: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtons: {
    gap: Spacing['3'],
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  legal: {
    marginTop: Spacing['4'],
    lineHeight: 16,
  },
});
