import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  isBiometricsEnabled,
  setBiometricsEnabled,
  checkBiometricsAvailable,
} from '../security/keyManager';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AutoLockTimeout = 'immediately' | '1m' | '5m' | 'never';

const SECURE_STORE_THEME = 'nl_theme_mode';
const SECURE_STORE_AUTOLOCK = 'nl_auto_lock_timeout';
const SECURE_STORE_DEV_OPTIONS = 'nl_dev_options_unlocked';

interface SettingsState {
  themeMode: ThemeMode;
  biometricsEnabled: boolean;
  biometricsHardwareAvailable: boolean;
  autoLockTimeout: AutoLockTimeout;
  isDeveloperOptionsUnlocked: boolean;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleBiometrics: (enabled: boolean, vaultKey?: Uint8Array | null) => Promise<boolean>;
  setAutoLockTimeout: (timeout: AutoLockTimeout) => Promise<void>;
  unlockDeveloperOptions: () => Promise<void>;
  hideDeveloperOptions: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'light',
  biometricsEnabled: false,
  biometricsHardwareAvailable: false,
  autoLockTimeout: 'never',
  isDeveloperOptionsUnlocked: false,
  isLoading: true,

  loadSettings: async () => {
    try {
      // 1. Biometrics
      const { hasHardware, isEnrolled } = await checkBiometricsAvailable();
      const bioEnabled = await isBiometricsEnabled();

      // 2. Theme
      const savedTheme = (await SecureStore.getItemAsync(SECURE_STORE_THEME)) as ThemeMode | null;
      const themeMode: ThemeMode = savedTheme && ['light', 'dark', 'system'].includes(savedTheme)
        ? savedTheme
        : 'light';

      // 3. Auto-Lock
      const savedTimeout = (await SecureStore.getItemAsync(SECURE_STORE_AUTOLOCK)) as AutoLockTimeout | null;
      const autoLockTimeout: AutoLockTimeout =
        savedTimeout && ['immediately', '1m', '5m', 'never'].includes(savedTimeout)
          ? savedTimeout
          : 'never';

      // 4. Developer options (hidden behind a repeated-tap gesture in Settings)
      const devUnlocked = await SecureStore.getItemAsync(SECURE_STORE_DEV_OPTIONS);

      set({
        themeMode,
        biometricsEnabled: bioEnabled && hasHardware && isEnrolled,
        biometricsHardwareAvailable: hasHardware && isEnrolled,
        autoLockTimeout,
        isDeveloperOptionsUnlocked: devUnlocked === 'true',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setThemeMode: async (mode: ThemeMode) => {
    set({ themeMode: mode });
    await SecureStore.setItemAsync(SECURE_STORE_THEME, mode).catch(() => {});
  },

  toggleBiometrics: async (enabled: boolean, vaultKey?: Uint8Array | null) => {
    try {
      if (enabled && !vaultKey) {
        return false;
      }
      await setBiometricsEnabled(enabled, vaultKey ?? undefined);
      set({ biometricsEnabled: enabled });
      return true;
    } catch {
      return false;
    }
  },

  setAutoLockTimeout: async (timeout: AutoLockTimeout) => {
    set({ autoLockTimeout: timeout });
    await SecureStore.setItemAsync(SECURE_STORE_AUTOLOCK, timeout).catch(() => {});
  },

  unlockDeveloperOptions: async () => {
    set({ isDeveloperOptionsUnlocked: true });
    await SecureStore.setItemAsync(SECURE_STORE_DEV_OPTIONS, 'true').catch(() => {});
  },

  hideDeveloperOptions: async () => {
    set({ isDeveloperOptionsUnlocked: false });
    await SecureStore.setItemAsync(SECURE_STORE_DEV_OPTIONS, 'false').catch(() => {});
  },
}));
