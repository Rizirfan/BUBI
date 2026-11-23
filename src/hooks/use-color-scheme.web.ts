import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

const emptySubscribe = () => () => {};

/**
 * Responsive color scheme hook for Web with hydration safety.
 */
export function useColorScheme(): 'light' | 'dark' {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useRNColorScheme();

  if (!isHydrated) {
    return 'light';
  }

  if (themeMode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return themeMode === 'dark' ? 'dark' : 'light';
}
