import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
      // Route based on auth state
      if (session) {
        router.replace('/(app)');
      } else {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [session, loading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg.primary },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen
          name="races"
          options={{
            headerShown: true,
            headerTitle: 'Races',
            headerStyle: { backgroundColor: Colors.bg.primary },
            headerTintColor: Colors.text.primary,
          }}
        />
        <Stack.Screen
          name="race/new"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Add Race',
            headerStyle: { backgroundColor: Colors.bg.primary },
            headerTintColor: Colors.text.primary,
          }}
        />
        <Stack.Screen
          name="race/[id]"
          options={{ headerShown: true, headerTitle: '', headerStyle: { backgroundColor: Colors.bg.primary }, headerTintColor: Colors.text.primary }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{ headerShown: true, headerTitle: '', headerStyle: { backgroundColor: Colors.bg.primary }, headerTintColor: Colors.text.primary }}
        />
        <Stack.Screen
          name="workout/manual"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Log a swim',
            headerStyle: { backgroundColor: Colors.bg.primary },
            headerTintColor: Colors.text.primary,
          }}
        />
        <Stack.Screen
          name="check-in"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="profile/baseline"
          options={{
            headerShown: true,
            headerTitle: 'Physical Baseline',
            headerStyle: { backgroundColor: Colors.bg.primary },
            headerTintColor: Colors.text.primary,
          }}
        />
        <Stack.Screen
          name="health/workouts"
          options={{
            headerShown: true,
            headerTitle: 'Apple Health',
            headerStyle: { backgroundColor: Colors.bg.primary },
            headerTintColor: Colors.text.primary,
          }}
        />
        <Stack.Screen
          name="profile/benchmark"
          options={{
            headerShown: true,
            headerTitle: 'CSS Benchmark',
            headerStyle: { backgroundColor: Colors.bg.primary },
            headerTintColor: Colors.text.primary,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
