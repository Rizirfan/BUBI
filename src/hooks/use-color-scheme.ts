import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export function useColorScheme(): 'light' | 'dark' {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useRNColorScheme();

  if (themeMode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return themeMode === 'dark' ? 'dark' : 'light';
}
