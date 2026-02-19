import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
          name="check-in"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
