import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '@/store/settingsStore';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    loadSettings();
    // Hide native splash screen once React hierarchy is mounted
    SplashScreen.hideAsync().catch(() => {});
  }, [loadSettings]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dev" options={{ headerShown: false }} />
        <Stack.Screen name="developer-options" options={{ headerShown: false }} />
        <Stack.Screen name="screen-mirror" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
